using System.Reflection;
using System.Reflection.Emit;
using System.Runtime.CompilerServices;
using HarmonyLib;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;

namespace VoiceDirector.Cards;

[HarmonyPatch]
public static class DrawPatch
{
    private static readonly MethodInfo Draw = AccessTools.Method(typeof(CardPileCmd), nameof(CardPileCmd.Draw), [typeof(PlayerChoiceContext), typeof(decimal), typeof(Player), typeof(bool)]);
    private static readonly Type Machine = Draw.GetCustomAttribute<AsyncStateMachineAttribute>()!.StateMachineType;
    private static readonly MethodInfo Add = AccessTools.Method(typeof(CardPileCmd), nameof(CardPileCmd.Add), [typeof(CardModel), typeof(CardPile), typeof(CardPilePosition), typeof(AbstractModel), typeof(bool)]);
    public static MethodBase TargetMethod() => AccessTools.Method(Machine, "MoveNext");
    public static IEnumerable<CodeInstruction> Transpiler(IEnumerable<CodeInstruction> source)
    {
        var instructions = source.ToList();
        var cardField = Machine.GetFields(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic).Single(f => f.FieldType == typeof(CardModel) && f.Name.StartsWith("<card>"));
        var resultField = Machine.GetFields(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic).Single(f => f.FieldType == typeof(List<CardModel>));
        var contextField = Machine.GetFields(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic).Single(f => f.FieldType == typeof(PlayerChoiceContext));
        var getResult = AccessTools.Method(typeof(TaskAwaiter<CardPileAddResult>), "GetResult");
        var addCount = 0;
        var resultCount = 0;
        for (var i = 0; i < instructions.Count; i++)
        {
            var instruction = instructions[i];
            if (instruction.Calls(Add))
            {
                var context = new CodeInstruction(OpCodes.Ldarg_0); context.labels.AddRange(instruction.labels); context.blocks.AddRange(instruction.blocks);
                instruction.labels.Clear(); instruction.blocks.Clear();
                yield return context;
                yield return new CodeInstruction(OpCodes.Ldfld, contextField);
                instruction.operand = AccessTools.Method(typeof(DrawPatch), nameof(AddDrawn)); addCount++;
            }
            if (instruction.opcode == OpCodes.Pop && i > 0 && instructions[i - 1].Calls(getResult))
            {
                var first = new CodeInstruction(OpCodes.Ldarg_0); first.labels.AddRange(instruction.labels); first.blocks.AddRange(instruction.blocks);
                yield return first;
                yield return new CodeInstruction(OpCodes.Ldflda, cardField);
                yield return new CodeInstruction(OpCodes.Ldarg_0);
                yield return new CodeInstruction(OpCodes.Ldfld, resultField);
                yield return new CodeInstruction(OpCodes.Call, AccessTools.Method(typeof(DrawPatch), nameof(Accept)));
                resultCount++;
            }
            else yield return instruction;
        }
        if (addCount != 1 || resultCount != 1) throw new InvalidOperationException("Unsupported Draw implementation; automatic transformations were not installed.");
    }
    public static async Task<CardPileAddResult> AddDrawn(CardModel card, CardPile hand, CardPilePosition position, AbstractModel? clonedBy, bool skipVisuals, PlayerChoiceContext context)
    {
        var result = await CardPileCmd.Add(card, hand, position, clonedBy, skipVisuals);
        if (!result.success || !hand.Cards.Contains(result.cardAdded)) return result;
        result.cardAdded = await Director.Drawn(result.cardAdded, context);
        return result;
    }
    public static void Accept(CardPileAddResult result, ref CardModel current, List<CardModel> drawn)
    {
        if (!result.success) return;
        if (drawn.Count == 0 || drawn[^1] != current) throw new InvalidOperationException("Draw identity changed unexpectedly.");
        current = result.cardAdded;
        drawn[^1] = current;
    }
}
