using Godot;
using HarmonyLib;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Commands.Builders;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Localization.DynamicVars;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Models.Powers;
using MegaCrit.Sts2.Core.ValueProps;
using VoiceDirector.Contracts;

namespace VoiceDirector.Cards;

public abstract class GeneratedCard : CardModel
{
    public string DefinitionId { get; }
    public CardDefinition Definition => DefinitionRegistry.Get(DefinitionId);
    protected GeneratedCard(string id) : base(DefinitionRegistry.Get(id).Cost,
        Enum.Parse<CardType>(DefinitionRegistry.Get(id).Type), Enum.Parse<CardRarity>(DefinitionRegistry.Get(id).Rarity),
        Enum.Parse<TargetType>(DefinitionRegistry.Get(id).Target), false) => DefinitionId = id;
    public override string Title => Definition.Name + (IsUpgraded ? "+" : "");
    public override CardPoolModel Pool => ModelDb.GetById<CardPoolModel>(ModelDb.GetId<GeneratedPool>());
    public override IEnumerable<CardKeyword> CanonicalKeywords => Definition.Keywords.Select(Enum.Parse<CardKeyword>);
    public override string PortraitPath => MissingPortraitPath;
    public override string BetaPortraitPath => MissingPortraitPath;
    public override bool GainsBlock => Definition.Effects.Any(e => e.Kind == "block");
    protected override IEnumerable<DynamicVar> CanonicalVars => Definition.Effects.Select((e, i) => e.Kind switch
    {
        "damage" => (DynamicVar)new DamageVar($"V{i}", e.Amount, ValueProp.Move),
        "block" => new BlockVar($"V{i}", e.Amount, ValueProp.Move),
        _ => new IntVar($"V{i}", e.Amount)
    });
    protected override void OnUpgrade()
    {
        for (var i = 0; i < Definition.Effects.Length; i++) DynamicVars[$"V{i}"].UpgradeValueBy(Definition.Effects[i].UpgradeAmount);
    }
    public string Describe() => string.Join(" ", Definition.Effects.Select((e, i) =>
        $"{(e.Condition == "always" ? "" : e.Condition == "lowHealth" ? "Below half health: " : "If target is poisoned: ")}" +
        (e.Kind switch
        {
            "damage" => $"Deal {DynamicVars[$"V{i}"].BaseValue} damage{(e.Target == "allEnemies" ? " to ALL enemies" : e.Target == "self" ? " to yourself" : "")}",
            "block" => $"Gain {DynamicVars[$"V{i}"].BaseValue} Block",
            "draw" => $"Draw {DynamicVars[$"V{i}"].BaseValue} cards",
            "energy" => $"Gain {DynamicVars[$"V{i}"].BaseValue} Energy",
            "power" => $"Apply {DynamicVars[$"V{i}"].BaseValue} {e.Power} to {e.Target}",
            "discard" => $"Discard {DynamicVars[$"V{i}"].BaseValue} random cards",
            "exhaust" => $"Exhaust {DynamicVars[$"V{i}"].BaseValue} random cards",
            _ => throw new InvalidOperationException(e.Kind)
        }) + (e.Repeat > 1 ? $", {e.Repeat} times." : "."))) + " " + string.Join(". ", Definition.Keywords);

    protected override async Task OnPlay(PlayerChoiceContext context, CardPlay play)
    {
        Director.Events.Emit("art-requested", this, "First-play artwork requested.");
        for (var index = 0; index < Definition.Effects.Length; index++)
        {
            var effect = Definition.Effects[index];
            if (effect.Condition == "lowHealth" && Owner.Creature.CurrentHp * 2 >= Owner.Creature.MaxHp) continue;
            if (effect.Condition == "targetPoisoned" && (play.Target?.GetPower<PoisonPower>()?.Amount ?? 0) <= 0) continue;
            var amount = DynamicVars[$"V{index}"].BaseValue;
            for (var repeat = 0; repeat < effect.Repeat; repeat++)
            {
                var targets = effect.Target switch
                {
                    "self" => new[] { Owner.Creature },
                    "enemy" => play.Target is null ? [] : new[] { play.Target },
                    _ => CombatState!.Enemies.Where(c => c.IsAlive).ToArray()
                };
                switch (effect.Kind)
                {
                    case "damage":
                        foreach (var target in targets) await new AttackCommand(amount).FromCard(this).Targeting(target).Execute(context);
                        break;
                    case "block": await CreatureCmd.GainBlock(Owner.Creature, amount, ValueProp.Move, play); break;
                    case "draw": await CardPileCmd.Draw(context, amount, Owner); break;
                    case "energy": await PlayerCmd.GainEnergy(amount, Owner); break;
                    case "power":
                        foreach (var target in targets) await PowerCmd.Apply(context, Power(effect.Power!).ToMutable(), target, amount, Owner.Creature, this);
                        break;
                    case "discard":
                    case "exhaust":
                        // Random choice uses the run's seeded combat RNG, not system randomness.
                        var hand = PileType.Hand.GetPile(Owner).Cards.Where(c => c != this).ToList();
                        for (var n = 0; n < amount && hand.Count > 0; n++)
                        {
                            var card = Owner.RunState.Rng.CombatCardSelection.NextItem(hand)!;
                            hand.Remove(card);
                            if (effect.Kind == "discard") await CardCmd.Discard(context, card);
                            else await CardCmd.Exhaust(context, card);
                        }
                        break;
                }
            }
        }
    }
    private static PowerModel Power(string name) => name switch
    {
        "Strength" => ModelDb.Power<StrengthPower>(), "Dexterity" => ModelDb.Power<DexterityPower>(),
        "Vulnerable" => ModelDb.Power<VulnerablePower>(), "Weak" => ModelDb.Power<WeakPower>(),
        "Poison" => ModelDb.Power<PoisonPower>(), "Thorns" => ModelDb.Power<ThornsPower>(),
        "Artifact" => ModelDb.Power<ArtifactPower>(), _ => throw new ArgumentException(name)
    };
}

[HarmonyPatch(typeof(CardModel), "get_Portrait")]
public static class PortraitPatch
{
    public static bool Prefix(CardModel __instance, ref Texture2D __result)
    {
        if (__instance is not GeneratedCard card) return true;
        __result = DefinitionRegistry.Portrait(card.DefinitionId);
        return false;
    }
}

[HarmonyPatch]
public static class DescriptionPatch
{
    public static System.Reflection.MethodBase TargetMethod() => AccessTools.GetDeclaredMethods(typeof(CardModel)).Single(m => m.Name == "GetDescriptionForPile" && m.GetParameters().Length == 3);
    public static bool Prefix(CardModel __instance, ref string __result)
    {
        if (__instance is not GeneratedCard card) return true;
        __result = card.Describe();
        return false;
    }
}
