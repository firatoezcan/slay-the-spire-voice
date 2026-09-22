# Runtime card registration and artwork replacement

Inspected on 22 September 2026: the installed macOS ARM64 `sts2.dll` associated with game release `v0.107.1`, the pinned BaseLib reference, and the pinned BLANKthespire reference. This is source-level verification. No game or mod was launched.

**New card types/IDs can be inserted into the model database at runtime.** The game exposes `ModelDb.Inject(Type)` for mods and tests. However, insertion is only one part of registering a usable card: the normal pool API explicitly freezes after initialization, and serialization/sorting IDs have their own startup-built registry. Supporting genuinely new types during a run therefore needs a registration layer that handles those boundaries.

**An existing card can change its artwork while the game is running.** The portrait can be supplied as a runtime texture, and the card UI can reload that texture. Showing a placeholder and starting generation on the card's first play is a supported-looking design with concrete implementation hooks. The full asynchronous flow remains to be exercised in-game.

| Capability | Finding |
| --- | --- |
| Add a new canonical model to `ModelDb` after startup | Yes: public `Inject(Type)` has no initialization-time guard |
| Add a new type to an already-consumed vanilla pool using `ModHelper.AddModelToPool` | No: that API throws once the pool is frozen |
| Support new types/IDs with custom registration and a dynamic pool | Feasible from the inspected interfaces and data structures; not implemented or runtime-tested |
| Create a playable instance from a dynamically obtained canonical model | Yes: `CombatState.CreateCard(CardModel, Player)` and the equivalent `RunState` overload require no compile-time generic type |
| Change a card portrait after construction | Yes: BaseLib can supply a different `Texture2D`; `NCard.Reload` reads it again |
| Start image generation on first play | Yes: `OnPlay` is an overridable execution hook; deduplicate requests across replays/copies |

## What runtime type registration actually entails

### Database identity and construction

`ModelDb` stores canonical models in a private `Dictionary<ModelId, AbstractModel>`. `Inject(Type)` checks `Contains(type)`, obtains `GetId(type)`, calls `Activator.CreateInstance(type)`, and inserts the result. There is no “game already started” check. A public parameterless constructor is required. The model constructor computes its own ID from its concrete type and rejects another canonical instance of an already-registered type. `InitId` fills numeric sorting IDs; despite its name, the constructor has already assigned the textual `Id`. [Local ModelDb evidence](../.research/decompiled/MegaCrit.Sts2.Core.Models.ModelDb.decompiled.cs), [local AbstractModel evidence](../.research/decompiled/MegaCrit.Sts2.Core.Models.AbstractModel.decompiled.cs)

Ordinarily the category comes from the model's root category class, and the entry comes from its concrete type name. BaseLib additionally prefixes custom models and supports `[CustomID]`. Thus a new CLR type can receive its own stable card ID; creating another instance of the same CLR type does not create a new card identity. [BaseLib ID patch](https://github.com/Alchyr/BaseLib-StS2/blob/master/Patches/Content/PrefixIdPatch.cs), [CustomID attribute](https://github.com/Alchyr/BaseLib-StS2/blob/master/Utils/Attributes/CustomIDAttribute.cs)

For genuinely new CLR types, .NET provides `AssemblyBuilder`/`TypeBuilder`, including runtime constructors. One possible implementation is an emitted thin subclass per generated definition, delegating gameplay to a shared interpreter. This is a proposed use of the documented .NET mechanism; dynamic emission inside this exact game process has not been tested. It is not necessary to compile unrestricted generated C# to create distinct card types. [Microsoft AssemblyBuilder reference](https://learn.microsoft.com/en-us/dotnet/api/system.reflection.emit.assemblybuilder?view=net-9.0)

### Pools are a separate boundary

`CardPoolModel.AllCards` caches its array, and `AllCardIds` caches a set. Its first `ConcatModelsFromMods` call sets `ModPoolContent.isFrozen`. Subsequent `AddModelToPool` calls throw. BaseLib's ordinary `CustomCardModel` constructor calls this path when `autoAdd` is true, so blindly injecting a late `CustomCardModel` into an ordinary pool will hit this boundary. [Local pool evidence](../.research/decompiled/MegaCrit.Sts2.Core.Models.CardPoolModel.decompiled.cs), [local ModHelper evidence](../.research/decompiled/MegaCrit.Sts2.Core.Modding.ModHelper.decompiled.cs), [BaseLib constructor](https://github.com/Alchyr/BaseLib-StS2/blob/master/Abstracts/CustomCardModel.cs)

A mod-owned dynamic pool is a plausible clean integration: register that pool at startup, override its virtual `AllCards` to enumerate a collection we own, and let generated cards override virtual `Pool` to reference it. That avoids depending on the base class's cached ID-membership lookup. Use `autoAdd: false` for runtime types and register them through our own path. If modifying a normal pool instead, its cached array, cached ID set and frozen registration state all need deliberate handling. **These are implementation alternatives, not a completed fix.**

Reward generation also has a concrete seam: `CardCreationOptions.WithCustomPool(IEnumerable<CardModel>)` accepts canonical cards, and `CardFactory` eventually creates their owner-bound instances through `RunState.CreateCard`. Direct insertion into hand/deck does not require joining every vanilla random-reward pool. [Local CardCreationOptions evidence](../.research/decompiled/MegaCrit.Sts2.Core.Runs.CardCreationOptions.decompiled.cs), [local CardFactory evidence](../.research/decompiled/MegaCrit.Sts2.Core.Factories.CardFactory.decompiled.cs)

### Sorting, networking and save restoration

`ModelIdSerializationCache.Init` scans built-in types and the assemblies recorded as loaded mods. It builds category/entry maps, reverse lists, packet bit widths and a compatibility value. An arbitrary newly emitted assembly is not automatically included. `AbstractModel.InitId` needs the entry map: an unknown entry throws. `PacketWriterExtensions.WriteModelEntry` instead writes `NONE` when an entry is missing. Calling `ModelDb.Inject` alone therefore does not complete registration, even if the immediate lookup works. [Local ID-cache evidence](../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Serialization.ModelIdSerializationCache.decompiled.cs), [local packet-writer evidence](../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Serialization.PacketWriterExtensions.decompiled.cs)

A true runtime-registration layer must extend or intercept these mappings, maintain the associated numeric widths and sorting IDs, and establish consistent definitions and mapping order across peers before transmitting cards. Re-running `Init()` alone will not discover an unrelated emitted assembly. This is the invasive part of the approach. A single-player experiment can narrow the immediate surface, but sorting and save restoration still require attention.

`CardModel.ToSerializable` saves the card ID, saved properties, upgrade level, enchantment and deck floor. `FromSerializable` first resolves the canonical card by ID, clones it, fills saved properties, calls `AfterDeserialized`, then reapplies enchantment and upgrades. An unknown ID resolves to `DeprecatedCard`. Generated definitions must consequently be persisted and their canonical types/IDs reconstructed **before** normal card deserialization. For generated types with `[SavedProperty]`, the installed build also exposes `SavedPropertiesTypeCache.InjectTypeIntoCache`; adding new property names additionally requires considering packet width synchronization. [Local CardModel evidence](../.research/decompiled/MegaCrit.Sts2.Core.Models.CardModel.decompiled.cs), [local SaveUtil evidence](../.research/decompiled/MegaCrit.Sts2.Core.Saves.SaveUtil.decompiled.cs), [local property-cache evidence](../.research/decompiled/MegaCrit.Sts2.Core.Saves.Runs.SavedPropertiesTypeCache.decompiled.cs)

### Canonical definitions versus playable copies

`CombatState.CreateCard(canonical, owner)` calls `ToMutable`, binds ownership, adds the card to the combat scope and invokes `AfterCreated`. `MutableClone` uses `MemberwiseClone`, then virtual `DeepCloneFields` and `AfterCloned`. CardModel copies its dynamic variables/cost and clears event subscriptions. Generated definitions should have explicit sharing/copy semantics; a constructor event subscription does not survive as a reliable per-instance play hook. The installed `Title`, `Type`, `Rarity`, `TargetType` and `Pool` properties are virtual. This also resolves the earlier report's uncertainty about independent titles: a subclass can override `Title`. [Local CombatState evidence](../.research/decompiled/MegaCrit.Sts2.Core.Combat.CombatState.decompiled.cs), [local AbstractModel evidence](../.research/decompiled/MegaCrit.Sts2.Core.Models.AbstractModel.decompiled.cs), [local CardModel evidence](../.research/decompiled/MegaCrit.Sts2.Core.Models.CardModel.decompiled.cs)

## Placeholder now, generated art on first play

The installed `CardModel.Portrait` normally loads `PortraitPath` with resource-cache reuse. BaseLib intercepts the getter and returns `CustomCardModel.CustomPortrait` first. BLANKthespire demonstrates loading PNG bytes, creating an `ImageTexture`, and returning that texture through this property. Merely overwriting an image file at an already-cached path is therefore not the best update mechanism. [BaseLib portrait hooks](https://github.com/Alchyr/BaseLib-StS2/blob/master/Abstracts/CustomCardModel.cs), [BLANKthespire texture loading](https://github.com/ryanrinkel/BLANKthespire/blob/main/mod/BlankTheSpireCode/Cards/Forged/ForgedCardArt.cs)

There are two concrete approaches:

1. Return a stable, mod-owned `ImageTexture` for the generated card definition. Initialize it with placeholder pixels, then call `Update(image)` when matching-size/format/mipmap pixels arrive, or `SetImage(image)` when reallocation is needed. Existing UI nodes retain the same texture object. Give different definitions separate textures, so completing one request cannot replace every card's placeholder. This follows Godot's documented texture-update mechanism; visible propagation in STS2 remains to be exercised. [Godot 4.5 ImageTexture](https://docs.godotengine.org/en/4.5/classes/class_imagetexture.html)
2. Replace the texture returned by `CustomPortrait`, then reload existing card nodes. The installed private `NCard.Reload` reads `Model.Portrait` and assigns the normal or ancient portrait `TextureRect`. Its generated Godot dispatch exposes `Reload`, so `node.CallDeferred(NCard.MethodName.Reload)` is a source-backed refresh route despite the private C# method. `UpdateVisuals` updates titles, descriptions and costs but **does not reload the portrait**. [Local NCard evidence](../.research/decompiled/MegaCrit.Sts2.Core.Nodes.Cards.NCard.decompiled.cs), [Godot deferred calls](https://docs.godotengine.org/en/4.5/classes/class_object.html#class-object-method-call-deferred)

Start a single request from the card's `OnPlay` override, keyed by generated definition. `OnPlayWrapper` invokes and awaits `OnPlay` for every replay, so deduplication is necessary. Start the artwork job without making card resolution wait for the remote image. On completion, apply texture changes on the game thread. If the card has already moved to discard, the stored texture can still be ready for its next appearance. `NCard.FindOnTable` only covers hand/play nodes, not deck/discard/exhaust viewers; a stable texture object or tracking all live views avoids missing those displays. [Local OnPlay and replay evidence](../.research/decompiled/MegaCrit.Sts2.Core.Models.CardModel.decompiled.cs), [local NCard lookup evidence](../.research/decompiled/MegaCrit.Sts2.Core.Nodes.Cards.NCard.decompiled.cs), [Godot thread rules](https://docs.godotengine.org/en/4.5/tutorials/performance/thread_safe_apis.html)

## What remains to verify

The product rules now also require a single transformation after taking a wildcard, a per-card once-per-turn cap, and guaranteed drawing of transformed deck cards on the next player turn. The existing source inspection does not establish the complete reward-acquisition or guaranteed-draw path. Verify persistent-instance identity across master-deck/combat copies, the post-take UI hook, turn-start draw scheduling, capacity/draw-prevention interactions and persistence of unfulfilled draw obligations. Reward cards transformed between fights target the next combat's opening draw.

The next useful spike is specifically a **new type created after game initialization**, registered with a distinct ID, displayed and played, then saved and reloaded after recreating that definition. Separately, show a placeholder, trigger one image job on first play, and replace the artwork while the original card and a second view/copy are visible. That directly checks the two requested capabilities without confusing precompiled slot cards with new runtime types.

BLANKthespire's restart requirement remains true for its chosen slot-loader implementation. It is not evidence that STS2 cannot support runtime type injection.

## Local evidence and reproducibility

The bounded decompilation is private and ignored under `.research/decompiled/`; it must not be committed. Source links above point to those local files and will not exist in a fresh clone until regenerated. Public BaseLib/BLANKthespire links refer to the authors' sources; the reference submodules pin the inspected copies.

The installed assembly was read from:

```text
/Users/firatoezcan/Library/Application Support/Steam/steamapps/common/Slay the Spire 2/SlayTheSpire2.app/Contents/Resources/data_sts2_macos_arm64/sts2.dll
```

ILSpy command-line 9.1 was obtained temporarily through Nix. Reproduce a selected class with `ilspycmd --disable-updatecheck -t MegaCrit.Sts2.Core.Models.ModelDb -o .research/decompiled <installed-sts2.dll>`. Each local file is named with its fully qualified type plus `.decompiled.cs`. No game files were changed, and no game-source files were added to version control.
