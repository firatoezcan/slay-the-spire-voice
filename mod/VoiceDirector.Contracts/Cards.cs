using System.ComponentModel.DataAnnotations;

namespace VoiceDirector.Contracts;

public sealed record CardEffect(string Kind, int Amount, string Target = "self", string? Power = null,
    int UpgradeAmount = 0, string Condition = "always", int Repeat = 1);

public sealed record CardDefinition(string Id, string Name, string Rarity, string Type, string Target,
    [property: Range(0, 5)] int Cost, CardEffect[] Effects, string[] Keywords, string Theme,
    string Rationale, string ArtPrompt, [property: Range(0, 12)] double Quality);

public sealed record CardInstance(string Id, string ModelId, string? DefinitionId, string Name, string Rarity,
    string Type, int Cost, int UpgradeLevel, string Pile, string Description,
    bool Wildcard, bool Resolved, bool Protected, int LastTransformedTurn);

public sealed record CandidateRequest(string RunId, string InstanceId, CardDefinition Definition, bool Lucky = false);
public sealed record TransformRequest(string RunId, string InstanceId, string DefinitionId, string RequestId);
public sealed record ArtRequest(string DefinitionId, string PngBase64);
public sealed record ProtectionRequest(string InstanceId, bool Protected);
public sealed record CardReference(string ModelId, string Name, string Pool, string Rarity, string Type,
    int Cost, string Description, string UpgradeDescription, string[] Keywords);
public sealed record ArtReferenceRequest(string ModelId);
public sealed record ArtReferenceSheet(string Pool, string[] ModelIds, string PngBase64);
public sealed record CardValidation(bool Valid, string? Error);

public static class CardRules
{
    public static void ValidateCandidate(CardDefinition card)
    {
        Validate(card);
        if (card.Quality is < 10 or > 12) throw new ArgumentException("New cards must beat the strongest cards of the same rarity; quality must be 10–12/10.");
        if (card.Rarity != "Rare" && HasDrawback(card))
            throw new ArgumentException("Only rare cards may have drawbacks. Remove self damage, debuffs, enemy buffs, forced discard/exhaust and Exhaust/Ethereal.");
        if (!card.Effects.Any(e => e.Amount > 0 && e.Condition == "always" && IsBenefit(e)))
            throw new ArgumentException("A card needs a useful unconditional payoff; conditions may add a bonus.");
    }
    public static bool HasDrawback(CardDefinition card) => card.Keywords.Any(k => k is "Exhaust" or "Ethereal") || card.Effects.Any(e =>
        e.Kind is "discard" or "exhaust" || (e.Kind == "damage" && e.Target == "self") ||
        (e.Kind == "power" && (e.Target == "self" ? e.Power is "Vulnerable" or "Weak" or "Poison" : e.Power is "Strength" or "Dexterity" or "Thorns" or "Artifact")));
    private static bool IsBenefit(CardEffect e) => e.Kind is "block" or "draw" or "energy" ||
        (e.Kind == "damage" && e.Target != "self") || (e.Kind == "power" &&
        (e.Target == "self" ? e.Power is "Strength" or "Dexterity" or "Thorns" or "Artifact" : e.Power is "Vulnerable" or "Weak" or "Poison"));
    public static readonly string[] EffectKinds = ["damage", "block", "draw", "energy", "power", "discard", "exhaust"];
    public static readonly string[] Powers = ["Strength", "Dexterity", "Vulnerable", "Weak", "Poison", "Thorns", "Artifact"];
    public static void Validate(CardDefinition card)
    {
        if (!System.Text.RegularExpressions.Regex.IsMatch(card.Id, "^[a-z0-9_]{8,64}$")) throw new ArgumentException("Definition ID must contain 8–64 lowercase letters, digits or underscores.");
        if (string.IsNullOrWhiteSpace(card.Name) || card.Name.Length > 60) throw new ArgumentException("Card name must contain 1–60 characters.");
        if (!new[] { "Basic", "Common", "Uncommon", "Rare" }.Contains(card.Rarity)) throw new ArgumentException("Unsupported rarity.");
        if (!new[] { "Attack", "Skill" }.Contains(card.Type)) throw new ArgumentException("Only Attack and Skill definitions are supported.");
        if (!new[] { "Self", "AnyEnemy", "AllEnemies" }.Contains(card.Target)) throw new ArgumentException("Unsupported target.");
        if (card.Cost is < 0 or > 5 || card.Quality is < 0 or > 12 || card.Effects.Length is < 1 or > 8) throw new ArgumentException("Card is outside supported bounds.");
        if (card.Keywords.Any(k => !new[] { "Exhaust", "Retain", "Ethereal", "Innate" }.Contains(k))) throw new ArgumentException("Unsupported keyword.");
        foreach (var effect in card.Effects)
        {
            if (!EffectKinds.Contains(effect.Kind) || effect.Amount is < 0 or > 50 || effect.UpgradeAmount is < 0 or > 20 || effect.Repeat is < 1 or > 3) throw new ArgumentException("Unsupported effect or amount.");
            if (!new[] { "self", "enemy", "allEnemies" }.Contains(effect.Target)) throw new ArgumentException("Unsupported effect target.");
            if (!new[] { "always", "targetPoisoned", "lowHealth" }.Contains(effect.Condition)) throw new ArgumentException("Unsupported effect condition.");
            if (effect.Kind == "power" && !Powers.Contains(effect.Power)) throw new ArgumentException("Unsupported power.");
            if ((effect.Kind is "draw" or "energy") && effect.Amount + effect.UpgradeAmount > 5) throw new ArgumentException("Draw/energy exceeds the execution budget.");
            if (effect.Target == "enemy" && card.Target != "AnyEnemy") throw new ArgumentException("Single-enemy effects require a selectable enemy target.");
            if ((effect.Kind is "block" or "draw" or "energy" or "discard" or "exhaust") && effect.Target != "self") throw new ArgumentException("This effect must target self.");
        }
        if (card.Cost == 0 && card.Effects.Any(e => e.Kind is "draw" or "energy") && !card.Keywords.Contains("Exhaust")) throw new ArgumentException("Free draw/energy cards must Exhaust to bound repeat loops.");
    }
}
