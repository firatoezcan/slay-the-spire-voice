# Reference projects

Collected on 2026-09-22 for **Slay the Spire 2**. These are full local checkouts, tracked as Git submodules at the inspected revision. The parent repository stores the upstream links and revision selections; it does not relicense the upstream work. None of these mods has been installed or run as part of this research.

## What each example answers

| Local checkout / upstream | Why it is here | Start reading here |
| --- | --- | --- |
| [mod-template](mod-template) · [Alchyr/ModTemplate-StS2](https://github.com/Alchyr/ModTemplate-StS2) | Standard project structure, entry point, content/character templates, asset packaging | [`content/ContentModTemplate`](mod-template/content/ContentModTemplate), especially `ContentModCode/MainFile.cs`, `ContentModCode/Cards/ContentModCard.cs`, `ContentMod.csproj`, and `ContentMod.json` |
| [baselib](baselib) · [Alchyr/BaseLib-StS2](https://github.com/Alchyr/BaseLib-StS2) | The actual community API implementation: custom models, descriptions, persistence, cloning | [`Abstracts/CustomCardModel.cs`](baselib/Abstracts/CustomCardModel.cs), plus the [API research map](../docs/modding-api.md) |
| [boxer](boxer) · [RiddlerQ/BoxerMod](https://github.com/RiddlerQ/BoxerMod) | A complete custom character/card mod: concrete cards, upgrades, powers, card pools, localization | [`BoxerModCode/Cards/BoxerCards.cs`](boxer/BoxerModCode/Cards/BoxerCards.cs), [`ScriptedBoxerCard.cs`](boxer/BoxerModCode/Cards/ScriptedBoxerCard.cs), [`BoxerModCard.cs`](boxer/BoxerModCode/Cards/BoxerModCard.cs) |
| [blank-the-spire](blank-the-spire) · [ryanrinkel/BLANKthespire](https://github.com/ryanrinkel/BLANKthespire) | Closest concept: generated classes/cards, a JSON contract, an effect interpreter, generated portraits | [`mod/BlankTheSpireCode/Engine/ForgedCards.cs`](blank-the-spire/mod/BlankTheSpireCode/Engine/ForgedCards.cs), [`mod/contract`](blank-the-spire/mod/contract), [`generation`](blank-the-spire/generation). New imports require a restart; this is not evidence of mid-run generation. |
| [communication-mod](communication-mod) · [Manuelbbl/Communication_Mod_STS2](https://github.com/Manuelbbl/Communication_Mod_STS2) | Outbound HTTP from a mod to a local service, then applying the response in-game | [`Communication_Mod_eng/Communication_ModCode/MainFile.cs`](communication-mod/Communication_Mod_eng/Communication_ModCode/MainFile.cs): `SenderLoop`, `SendDataToAI`; [`server.py`](communication-mod/server.py) |
| [sts2-ai-mod](sts2-ai-mod) · [ndwang/sts2-ai-mod](https://github.com/ndwang/sts2-ai-mod) | A local HTTP server inside the mod, game state endpoints, action dispatch | [`HttpServer.cs`](sts2-ai-mod/HttpServer.cs), [`Plugin.cs`](sts2-ai-mod/Plugin.cs), [`Utilities/GodotMainThread.cs`](sts2-ai-mod/Utilities/GodotMainThread.cs) |
| [neuro-sts2](neuro-sts2) · [VedalAI/neuro-sts2](https://github.com/VedalAI/neuro-sts2) | Persistent WebSocket communication with an external AI system | [`NeuroSdk/Websocket/WebsocketConnection.cs`](neuro-sts2/NeuroSdk/Websocket/WebsocketConnection.cs), [`NeuroSdk/NeuroSdkSetup.cs`](neuro-sts2/NeuroSdk/NeuroSdkSetup.cs) |

## A useful reading order

1. Read the content template's manifest, project file, initializer, and card base class together. That is the smallest map of how a mod is packaged.
2. Follow Boxer's `Jab` from its card declaration into `ScriptedBoxerCard.OnPlay`, then its localization entry. This connects the displayed card to executable effects.
3. Read BLANKthespire's contract and `DataCard`. Its fixed card slots show how data can drive those effects, and where startup registration constrains it.
4. Read `SendDataToAI` and `GodotMainThread.RunAsync`. These demonstrate the boundary between asynchronous network work and game changes.
5. Consult BaseLib's implementation for the per-instance state, cloning, description, and portrait hooks needed by a generated card.

## Reuse terms found in these checkouts

| Project | Checked-in terms |
| --- | --- |
| BaseLib | [MIT](baselib/LICENSE.txt) |
| BLANKthespire | [MIT for original code/content, with a game-IP notice](blank-the-spire/LICENSE) |
| BoxerMod | [MIT for source code; non-code assets have separate reserved rights](boxer/LICENSE.md) |
| sts2-ai-mod | [MIT](sts2-ai-mod/LICENSE) |
| neuro-sts2 | [MIT](neuro-sts2/LICENSE); bundled NativeWebSocket has its [own notice](neuro-sts2/NeuroSdk/External/NativeWebSocket/LICENSE.txt) |
| Alchyr template; Communication_Mod_STS2 | No root license file found in the inspected checkouts. Keep these as reading references; do not assume permission to reuse their source in a distributed mod. |

The upstream license files are preserved. Artwork in a reference checkout is not an asset library for our mod.

## Getting the same source

```sh
git submodule update --init --recursive
```

Do not use `--remote` unless deliberately refreshing the references: it moves to newer upstream code rather than the versions this research inspected. Some upstream build targets automatically copy output into the game's mods directory; read the project file before building a reference.
