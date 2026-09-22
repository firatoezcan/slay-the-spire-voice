# Implementation API reference

Verified against the installed macOS ARM64 `sts2.dll` associated with release `v0.107.1`, 22 September 2026. This is source and IL inspection, not execution of a mod. Local source links point into ignored `.research/decompiled/` and must remain uncommitted.

Current behavior: automatic transformations happen on an actual combat draw, including mid-turn draws. Use a ready candidate or leave the card unchanged. No additional draw, delayed-draw obligation, or model-generation await belongs in the draw path.

## Draw interception: two changes to the existing async state machine

Target this overload in `MegaCrit.Sts2.Core.Commands.CardPileCmd`:

```csharp
public static Task<IEnumerable<CardModel>> Draw(
    PlayerChoiceContext choiceContext, decimal count,
    Player player, bool fromHandDraw = false);
```

Resolve its `AsyncStateMachineAttribute.StateMachineType` and patch that type's instance `MoveNext` using Harmony. The installed generated type is `<Draw>d__16`; derive it from the attribute instead of hard-coding the compiler ordinal. [Local Draw source](../.research/decompiled/MegaCrit.Sts2.Core.Commands.CardPileCmd.decompiled.cs), [Harmony transpilers](https://harmony.pardeike.net/v2/articles/patching-transpiler.html)

The original flow is: `ShouldDraw` and capacity checks → awaited shuffle if required → final top-card/null/capacity check → append card to result list → await hand addition → record draw history → await draw hooks → invoke card's Drawn event. There is no `BeforeCardDrawn` hook. `AfterCardDrawnEarly` is the early listener pass inside the after-draw hook, already after the hand-add animation and history.

The following offsets were checked in the actual IL. They identify evidence, not patch-match constants:

| Installed IL | Meaning |
| --- | --- |
| `IL_0243` | Stores selected top card into `<card>5__8` |
| `IL_0268` | Final full-hand branch exits before adding/drawing |
| `IL_0279` | `List<CardModel>.Add(card)` on `<result>5__3` |
| `IL_028d` | Calls the `Add(CardModel, CardPile, CardPilePosition, AbstractModel, bool)` overload |
| `IL_02e5` / `IL_02ea` | `TaskAwaiter<CardPileAddResult>.GetResult()` followed by `pop` |
| `IL_0307` | `CombatHistory.CardDrawn` reads `<card>5__8` |
| `IL_0324` | `Hook.AfterCardDrawn` reads the same card field |

Other useful fields are `<hand>5__4`, `choiceContext`, `player`, and `fromHandDraw`.

**Patch A:** replace only this Draw call site with a mod helper returning the same `Task<CardPileAddResult>`. The original signature is:

```csharp
public static Task<CardPileAddResult> Add(
    CardModel card, CardPile newPile,
    CardPilePosition position = CardPilePosition.Bottom,
    AbstractModel? clonedBy = null, bool skipVisuals = false);
```

Append loads for `choiceContext`/`player`/`fromHandDraw` if the helper needs them. Keep the return type unchanged, preserving the compiler's existing await state. Call the actual normal Add overload from the helper; only the Draw call site is patched, so this does not recurse.

For strict actual-draw semantics, the helper first awaits normal Add and verifies `result.success` and actual membership in the expected hand. It then consumes an eligible ready candidate, performs the native transformations, and returns the final combat card in `cardAdded`. No candidate means no mutation. Initial NoDraw/zero-count/full-hand exits never reach this helper. [Local Add implementation](../.research/decompiled/MegaCrit.Sts2.Core.Commands.CardPileCmd.decompiled.cs)

**Patch B:** replace the `pop` after the matching awaiter's `GetResult`. At this point `CardPileAddResult` is on the evaluation stack. A synchronous acceptor can take:

```csharp
void AcceptDrawResult(
    CardPileAddResult result,
    ref CardModel currentCard,
    List<CardModel> drawnCards);
```

Supply the second argument with `ldarg.0; ldflda <card-field>` and the third with `ldarg.0; ldfld <result-field>`. The acceptor replaces the just-appended original-card entry with `result.cardAdded` and updates `currentCard`. Assert that the expected last entry is the original object. Do not retain this field reference across an await. All later history, hooks, events and the returned draw list then see the same replacement instance.

Match the exact `MethodInfo` operands and their surrounding field loads, preserving instruction labels/exception blocks. Verify exactly one Add seam and one corresponding GetResult/pop seam; report incompatibility if either differs. A global Add patch does not work: ordinary moves also call Add, and Draw otherwise retains the old card reference. A `ShuffleIfNecessary` postfix is also unsuitable because autoplay uses it and the final draw guard has not run yet.

**Visual tradeoff:** this strict path draws the original normally, then transforms it before draw callbacks. It does not promise replacement before the first visual reveal. Transforming before Add could reveal only the replacement, but transformation callbacks can change hand capacity or piles before the draw succeeds. That requires additional transaction handling.

### Persistent and combat transformations

```csharp
// MegaCrit.Sts2.Core.Commands.CardCmd
public static Task<CardPileAddResult?> Transform(
    CardModel original, CardModel replacement,
    CardPreviewStyle style = CardPreviewStyle.HorizontalLayout);

// RunState and CombatState both expose:
public CardModel CreateCard(CardModel canonicalCard, Player owner);
```

`Player.PopulateCombatState` creates a combat clone for each persistent deck card and sets `combatCopy.DeckVersion = deckCard`. Capture that exact reference before transformation. Create the persistent replacement through `RunState.CreateCard`, transform that deck instance, and create/transform the drawn combat replacement through `CombatState.CreateCard`. Set the resulting combat card's `DeckVersion` to the returned persistent card. Read `CardPileAddResult.cardAdded`, since deck-add modification hooks can substitute another card. Do not use a model ID to choose among identical deck copies. [Player mapping](../.research/decompiled/MegaCrit.Sts2.Core.Entities.Players.Player.decompiled.cs), [native Transform](../.research/decompiled/MegaCrit.Sts2.Core.Commands.CardCmd.decompiled.cs)

Native Transform updates transformation history, runs deck modification and combat-entry/generation/pile-change hooks, calls the card's transformation hooks, and removes the old instance from its scope. It affects only the provided original's pile, not its associated deck/combat counterpart. `CardPreviewStyle.None` suppresses the non-hand preview branch; it does not suppress the separate hand transformation animation. Avoid mixing deck and combat replacements into one bulk Transform call: its shared combat context comes from the first original.

`CardPile.AddInternal`/`RemoveInternal` are synchronous and maintain pile contents, state-tracker subscriptions and UI events, but omit the native transformation history/gameplay-hook sequence. They are not interchangeable with Transform. [Local pile primitives](../.research/decompiled/MegaCrit.Sts2.Core.Entities.Cards.CardPile.decompiled.cs)

## Wildcard binding and the post-acquisition prompt

Types and signatures:

```csharp
// MegaCrit.Sts2.Core.Rewards.CardReward
public override void Populate();
public IEnumerable<CardModel> Cards { get; }
protected override Task<bool> OnSelect();
// Private instance storage: List<CardCreationResult> _cards

// MegaCrit.Sts2.Core.Entities.Cards.CardCreationResult
public CardModel Card { get; }
public CardCreationResult(CardModel originalCard);
public void ModifyCard(CardModel card);

// MegaCrit.Sts2.Core.Nodes.Screens.CardSelection.NCardRewardSelectionScreen
public static NCardRewardSelectionScreen? ShowScreen(
    IReadOnlyList<CardCreationResult> options,
    IReadOnlyList<CardRewardAlternative> extraOptions);
public void RefreshOptions(IReadOnlyList<CardCreationResult> options,
    IReadOnlyList<CardRewardAlternative> extraOptions);
public Task<int?> OptionSelected();
public NCardHolder GetCardHolder(CardModel card);
```

Let vanilla populate and modify its options, then bind the wildcard to one `_cards` entry. Inspect that entry's final `Card` rarity/upgrade state. `ModifyCard(replacement)` preserves the result wrapper and its existing modifying-relic list. The replacement must already be owner-bound and registered in the run's card scope. Record the binding once per reward; Populate can be called repeatedly and vanilla rerolls are a separate path. Inspect manually supplied rewards too: they do not follow the ordinary first-generation branch. [CardReward](../.research/decompiled/MegaCrit.Sts2.Core.Rewards.CardReward.decompiled.cs), [CardCreationResult](../.research/decompiled/MegaCrit.Sts2.Core.Entities.Cards.CardCreationResult.decompiled.cs)

Do not infer acquisition from a UI click. Inside `CardReward.OnSelect`, the selected card is passed to `await CardPileCmd.Add(obtainedCard, PileType.Deck)`. Only a successful result establishes acquisition; `cardAdded` may differ from the requested card.

A practical post-take sequence is:

1. Associate the active reward's wildcard candidate object with its persisted reward binding when OnSelect begins.
2. Wrap the returned Task of the exact `CardPileCmd.Add(CardModel, PileType, ...)` overload for that candidate and `PileType.Deck`; capture the successful result's actual `cardAdded`.
3. Wrap `CardReward.OnSelect`'s returned `Task<bool>` with an async postfix continuation. Await the original, then display Keep/Transform/Lucky only for captured successful wildcard acquisition. Await this prompt before completing the wrapper.

Vanilla OnSelect has removed its selection overlay by then. The outer `Reward.SelectUnsynchronized` still awaits OnSelect, so its `AfterRewardTaken` and success completion wait for the prompt. Do not call SelectUnsynchronized independently: the normal entry is `RunManager.Instance.RewardsSetSynchronizer.SelectLocalReward(reward)`. Multi-pick rewards can keep their selection loop open before this continuation. [Reward completion chain](../.research/decompiled/MegaCrit.Sts2.Core.Rewards.Reward.decompiled.cs), [Harmony task-result postfix mechanics](https://harmony.pardeike.net/v2/articles/patching-postfix.html)

Reserve the single allowance while a request is pending and consume it only after a valid transformation commits. An unused allowance remains eligible for the configured future-draw surprise. Persist that state with the card lineage. Postfix task wrapping does not postpone the start of the original method: if wildcard generation is pending before selection, a separate explicit selection gate is needed.

**Persistence gap:** vanilla `CardReward.ToSerializable` records source, pool IDs, rarity odds and option count, not `_cards`, the generated slot or acquisition state. A mod-owned persisted reward binding is required for stable reopening/reloading; object references alone are insufficient.

## Stable lineage on vanilla cards

A mod cannot add a CLR `[SavedProperty]` property to an existing vanilla card class. It can attach state externally and save through the existing DTO:

```csharp
// MegaCrit.Sts2.Core.Saves.Runs
SerializableCard CardModel.ToSerializable();
SavedProperties? SerializableCard.Props { get; set; }
List<SavedProperties.SavedProperty<string>>? SavedProperties.strings;
SavedProperties.SavedProperty<T>(string name, T value);
void SavedProperties.FillInternal(object model);
```

Use a `ConditionalWeakTable<CardModel, ...>` for live state. In a `CardModel.ToSerializable` postfix, ensure `Props` and its strings list exist and upsert a namespaced string property containing the card's stable lineage/state. In a `SavedProperties.FillInternal` postfix, read that property and attach the state to the target CardModel. Vanilla Fill ignores string-property names that have no reflected property, so it leaves this entry for the mod to interpret. Fill runs before `CardModel.AfterDeserialized`. This works on vanilla subclasses without deck-index identity. [SavedProperties](../.research/decompiled/MegaCrit.Sts2.Core.Saves.Runs.SavedProperties.decompiled.cs), [CardModel serialization order](../.research/decompiled/MegaCrit.Sts2.Core.Models.CardModel.decompiled.cs)

If this property can enter packet serialization, register its fixed name once in `SavedPropertiesTypeCache._propertyNameToNetIdMap` and `_netIdToPropertyNameMap` and recompute `NetIdBitSize`. Unknown names otherwise fail packet serialization. BaseLib demonstrates these exact native save hooks and registry updates. Its alternative is `SavedSpireField<CardModel,string>`; `CopyOnClone()` is optional, shallow by default, and must not accidentally give a new persistent duplicate the same instance identity. [BaseLib save hooks](https://github.com/Alchyr/BaseLib-StS2/blob/master/Patches/Utils/SavedSpireFieldPatch.cs), [field and copy behavior](https://github.com/Alchyr/BaseLib-StS2/blob/master/Utils/SpireField.cs)

Assign an ID to each independent persistent card instance. Transfer its lineage intentionally during transformation. Resolve ordinary combat copies through `DeckVersion`; `Player.PopulateCombatState` supplies that mapping. A new permanent duplicate gets a fresh instance ID, whereas a transformation retains its lineage and allowance/turn-limit history. Use `PlayerCombatState.TurnNumber`, plus run/combat/player identity, for the per-turn limit: it includes extra turns and differs from combat round number. No draw-obligation field is needed for the current mechanic.

## Normal gameplay API entry points

These operations must run on the game thread and resolve/validate against current state. Preserve UI enablement and pending-selection rules; the backend methods do not reproduce every UI guard.

| Operation | Exact inspected route |
| --- | --- |
| Map selection | `MegaCrit.Sts2.Core.Nodes.Screens.Map.NMapScreen.OnMapPointSelectedLocally(NMapPoint point): void` enqueues `VoteForMapCoordAction`. Validate travelability/current map first; `NMapPoint.OnSelected()` is an empty preselection hook, not the selection action. |
| Claim reward | `MegaCrit.Sts2.Core.Multiplayer.Game.RewardsSetSynchronizer.SelectLocalReward(Reward reward): Task<bool>`, obtained from `RunManager.Instance.RewardsSetSynchronizer`. Requires the active local reward set. |
| Select reward card | Active `NCardRewardSelectionScreen` holder press completes `OptionSelected`; vanilla then performs acquisition. Resolve the current holder with `GetCardHolder(card)` and use the control's normal input route. |
| Event option | `MegaCrit.Sts2.Core.Nodes.Rooms.NEventRoom.OptionButtonClicked(EventOption option, int index): void`; its UI route accounts for option behavior. Lower-level `EventSynchronizer.ChooseLocalOption(int index): void`, followed by `AwaitPendingOptionTasks(): Task`, handles synchronization. Validate option locking and current page; the button performs additional guards. |
| Shop purchase | `MegaCrit.Sts2.Core.Entities.Merchant.MerchantEntry.OnTryPurchaseWrapper(MerchantInventory? inventory, bool ignoreCost=false): Task<bool>`. Keep `ignoreCost=false`; wrapper checks stock/gold, executes purchase, runs restock/hooks and completion events. Inventory exposes `AllEntries`, card/relic/potion entry lists and `CardRemovalEntry`. |
| Proceed/leave | Use the current screen's enabled proceed control. Reward proceeds have boss/act-change, skip, tutorial and nested-screen branches; do not replace them all with a generic room jump. |

[Map selection source](../.research/decompiled/MegaCrit.Sts2.Core.Nodes.Screens.Map.NMapScreen.decompiled.cs), [reward synchronization](../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Game.RewardsSetSynchronizer.decompiled.cs), [event room](../.research/decompiled/MegaCrit.Sts2.Core.Nodes.Rooms.NEventRoom.decompiled.cs), [event synchronization](../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Game.EventSynchronizer.decompiled.cs), [merchant entry](../.research/decompiled/MegaCrit.Sts2.Core.Entities.Merchant.MerchantEntry.decompiled.cs), [reward proceed branches](../.research/decompiled/MegaCrit.Sts2.Core.Nodes.Screens.NRewardsScreen.decompiled.cs).

The imported Neuro integration independently demonstrates these UI/command routes and deferred game-thread execution: [MapHandler](../references/neuro-sts2/Contexts/MapHandler.cs), [EventHandler](../references/neuro-sts2/Contexts/EventHandler.cs), [ShopHandler](../references/neuro-sts2/Contexts/ShopHandler.cs), [RewardsHandler](../references/neuro-sts2/Contexts/RewardsHandler.cs), [GodotMainThread](../references/neuro-sts2/Utilities/GodotMainThread.cs).

## Validation boundary

Only API/source/IL research was performed here. The Draw patch, post-take continuation, save round trip, duplicate lineage handling and UI wrappers have not been executed. Preserve ignored game-source outputs locally; this report contains the implementation pointers, not redistributed game source.
