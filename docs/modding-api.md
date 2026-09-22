# Slay the Spire 2 modding API and generated-card feasibility

Research date: 22 September 2026. Scope: **Slay the Spire 2**. Source inspection supports a C#/BaseLib prototype for cards whose behavior comes from generated data. Creating distinct cards during an ongoing run is the key behavior still to prove in the game; the closest inspected generation mod loads its definitions at startup.

## Where the API documentation lives

There is no complete game API manual in the sources inspected. The practical reference is the BaseLib maintainer's documentation and source, plus the installed game's assemblies. The BaseLib card reference itself still marks its underlying `CardModel` documentation as TODO, and its setup guide recommends inspecting the game's implementations. These are community-maintained integration surfaces, not a promised stable Mega Crit SDK. [CustomCardModel documentation](https://alchyr.github.io/BaseLib-Wiki/docs/models/custom-card.html), [modding basics](https://github.com/Alchyr/ModTemplate-StS2/wiki/Modding-Basics)

| Reference | What to use it for |
| --- | --- |
| [BaseLib documentation](https://alchyr.github.io/BaseLib-Wiki/) and [source](https://github.com/Alchyr/BaseLib-StS2) | Custom cards, pools, saved fields, UI and localization helpers |
| [ModTemplate setup guide](https://github.com/Alchyr/ModTemplate-StS2/wiki/Setup) | Current toolchain and packaging setup |
| [Adding Cards](https://github.com/Alchyr/ModTemplate-StS2/wiki/Adding-Cards) and [commands cookbook](https://github.com/Alchyr/ModTemplate-StS2/wiki/Common-Commands-Cookbook) | Card class structure, artwork, commands and effects |
| [Decompiling guide](https://github.com/Alchyr/ModTemplate-StS2/wiki/Decompiling) | Inspect the exact game build's `CardModel`, factories, commands and lifecycle |
| [Harmony documentation](https://harmony.pardeike.net/v2/articles/intro.html) | Patching methods where a supported override/helper does not cover the requirement |
| [Godot documentation](https://docs.godotengine.org/en/stable/) | Audio, HTTP, textures, nodes and main-thread behavior |

The content template targets `net9.0` and `Godot.NET.Sdk/4.5.1`, references the installed `sts2.dll` and `0Harmony.dll`, and depends on BaseLib through NuGet. The current guide recommends Mega Crit's [MegaDot](https://megadot.megacrit.com/) engine distribution. Keep the game build, BaseLib and engine versions aligned when beginning implementation. [Template project](https://github.com/Alchyr/ModTemplate-StS2/blob/master/content/ContentModTemplate/ContentMod.csproj), [setup guide](https://github.com/Alchyr/ModTemplate-StS2/wiki/Setup)

Workspace inspection found an installed ARM64 game build `v0.107.1` dated 18 June 2026, with `sts2.dll` and a .NET 9 runtime configuration. The current reference sources may expect later APIs. `dotnet` and Godot executables were not on PATH, so compatibility and build readiness remain unverified.

## What the inspected code supports

### Ordinary custom cards

The template's entry point uses `[ModInitializer(nameof(Initialize))]`; its initializer installs the mod's Harmony patches. A card inherits `CustomCardModel`, declares a `[Pool]`, supplies cost/type/rarity/target, and implements `OnPlay` and optionally `OnUpgrade`. Its constructor registers the **C# model type** through `CustomContentDictionary.AddModel`; registration eventually calls `ModHelper.AddModelToPool`. This registers a kind of card, not a fresh model ID for each generated response. [Initializer](https://github.com/Alchyr/ModTemplate-StS2/blob/master/content/ContentModTemplate/ContentModCode/MainFile.cs), [CustomCardModel](https://github.com/Alchyr/BaseLib-StS2/blob/master/Abstracts/CustomCardModel.cs), [content registration](https://github.com/Alchyr/BaseLib-StS2/blob/master/Patches/Content/ContentPatches.cs)

Card behavior runs through commands such as `DamageCmd`, `PowerCmd` and `CardPileCmd`. BLANKthespire demonstrates owner-bound combat-card creation with `CombatState.CreateCard<T>(owner)`, followed by `CardPileCmd.AddGeneratedCardToCombat(...)`. That example creates existing registered card types; it does not prove new type registration after initialization. [EffectRunner.AddStatusCards](https://github.com/ryanrinkel/BLANKthespire/blob/main/mod/BlankTheSpireCode/Engine/EffectRunner.cs)

### Data-defined effects already have a concrete precedent

BLANKthespire's `DataCard` receives a `CardSpec`, declares variables for its effects, and delegates `OnPlay` to `EffectRunner`. `ForgedCards.TryParseCardJson` validates definitions against an implemented vocabulary. This is a useful pattern for translating a generated definition into normal game commands. [DataCard](https://github.com/ryanrinkel/BLANKthespire/blob/main/mod/BlankTheSpireCode/Engine/DataCard.cs), [CardSpec](https://github.com/ryanrinkel/BLANKthespire/blob/main/mod/BlankTheSpireCode/Engine/CardSpec.cs), [parser and validator](https://github.com/ryanrinkel/BLANKthespire/blob/main/mod/BlankTheSpireCode/Engine/ForgedCards.cs)

Its standalone forged-card path ships **40 precompiled slot classes** and caches JSON specs when first loaded. The source explicitly requires a restart after importing new definitions because its pools are initialized at startup. Treat this as evidence for data-driven cards and an interpreter, not for immediate generation during combat. [ForgedCards](https://github.com/ryanrinkel/BLANKthespire/blob/main/mod/BlankTheSpireCode/Engine/ForgedCards.cs), [ForgedSlotCard](https://github.com/ryanrinkel/BLANKthespire/blob/main/mod/BlankTheSpireCode/Cards/Forged/ForgedSlotCard.cs)

### Per-instance state, copies and saves

BaseLib's `SpireField` stores values against object instances in a `ConditionalWeakTable`. `SavedSpireField<CardSubclass, string>` can carry a serialized generated definition: `string` is a supported saved value and `CardModel` subclasses are supported holders. Its save patches export into `SavedProperties.FromInternal` and restore through `FillInternal`. Register the field during mod startup; BaseLib discovers and finalizes saved fields around `ModelDb.InitIds`. [SpireField source](https://github.com/Alchyr/BaseLib-StS2/blob/master/Utils/SpireField.cs), [supported types](https://github.com/Alchyr/BaseLib-StS2/blob/master/Utils/SavePatchUtils.cs), [save hooks](https://github.com/Alchyr/BaseLib-StS2/blob/master/Patches/Utils/SavedSpireFieldPatch.cs), [initialization](https://github.com/Alchyr/BaseLib-StS2/blob/master/Patches/PostModInitPatch.cs)

Saving and cloning are separate concerns. `CopyOnClone()` is opt-in and hooks `AbstractModel.MutableClone`. Its default copies the value shallowly; a custom callback can copy mutable values differently. A saved immutable JSON string is therefore a plausible small prototype representation. These hooks persist/copy the attached value; they do **not** automatically rebuild card cost, dynamic variables, title or artwork from that value. The generated-card implementation must restore its derived state at the correct point. [Clone implementation](https://github.com/Alchyr/BaseLib-StS2/blob/master/Utils/SpireField.cs)

For richer object state, BaseLib exposes explicit type registration and packet serializers through `ExtendedSaveTypes`; its extended card path hooks `ToSerializable`, `FromSerializable`, and packet read/write. This is relevant to eventual co-op, but is not proof that a complete generated-card protocol will synchronize correctly. [Saved-field guide](https://alchyr.github.io/BaseLib-Wiki/docs/utilities/spirefield.html), [extended save types](https://github.com/Alchyr/BaseLib-StS2/blob/master/Patches/Saves/ExtendedSaveTypes.cs), [card serialization patches](https://github.com/Alchyr/BaseLib-StS2/blob/master/Patches/Saves/ExtendedSaveHandlers.cs)

### Names, descriptions and portraits

BaseLib's `ILocalizationProvider` is read during `ModelDb.Init` and writes entries keyed by model ID. Two generated instances sharing that ID would share those localization entries. Per-instance descriptions have a concrete hook in `DescriptionOverrides.CustomizeDescription`/`CustomizeDescriptionPost`, both of which receive the actual card. Independent titles, dynamic-variable initialization and refresh behavior still need inspection of the installed game's render path. [Localization registration](https://github.com/Alchyr/BaseLib-StS2/blob/master/Patches/Localization/ModelLocPatch.cs), [description hooks](https://github.com/Alchyr/BaseLib-StS2/blob/master/Patches/Localization/DescriptionOverrides.cs)

`CustomCardModel.CustomPortrait` returns a `Texture2D` and is checked before the portrait path. BLANKthespire loads PNG bytes from `user://`, creates an `ImageTexture`, caches it and assigns a resource path for BaseLib's portrait-path hook. This gives us a concrete generated-art integration example without rebuilding a `.pck`. [Portrait hooks](https://github.com/Alchyr/BaseLib-StS2/blob/master/Abstracts/CustomCardModel.cs), [ForgedCardArt](https://github.com/ryanrinkel/BLANKthespire/blob/main/mod/BlankTheSpireCode/Cards/Forged/ForgedCardArt.cs)

### Microphone, network and game-thread boundaries

Godot provides `AudioStreamMicrophone` with `AudioEffectCapture` to obtain live PCM samples. Input must be enabled and OS microphone permissions apply. This proves an engine capability; microphone permission and capture inside the shipped STS2 app have not been verified. [AudioStreamMicrophone](https://docs.godotengine.org/en/stable/classes/class_audiostreammicrophone.html), [AudioEffectCapture](https://docs.godotengine.org/en/stable/classes/class_audioeffectcapture.html)

Godot's `HttpRequest` supports HTTP(S), request completion signals and byte responses, including image downloads. Active scene-tree changes are not thread-safe; Godot documents deferred calls as a route to applying them on the main thread. Keep network/audio processing asynchronous, then schedule card insertion and texture/UI work through the game thread and normal game commands. No STS2-specific universal scheduler was established in this research. [HttpRequest](https://docs.godotengine.org/en/stable/classes/class_httprequest.html), [thread safety](https://docs.godotengine.org/en/stable/tutorials/performance/thread_safe_apis.html)

## Recommended first experiment

This is a proposed architecture, not an implemented or runtime-verified result:

1. Pre-register one simple generated attack-card type. Create two owner-bound instances during a running combat with different fixed definitions. Confirm separate text, damage and portraits.
2. Attach an immutable definition to each instance, enable its clone handling, and execute a small set of effects through ordinary game commands. Add card shapes/types only after their constructor and targeting constraints are understood.
3. Confirm hand/deck copies, upgrades, previews and save/reload preserve the definition and rebuild the correct state. Persistent deck cards and temporary combat cards must be exercised separately.
4. Replace fixed input with an asynchronous generated JSON response, then add microphone capture/transcription. Validate the response before inserting the card and tie pending work to the active run so late responses cannot enter another run.

The decisive technical question is whether one registered card type can render and retain distinct generated instance definitions across all these paths. BaseLib provides useful pieces; the inspected sources do not establish that complete behavior. No mod build, game launch, microphone session, network request from inside the game, save round trip or co-op session was performed for this report.

Source-code claims above were checked against the local reference submodules. The repository pins those copies; the external documentation links describe their authors' current guidance and may evolve.
