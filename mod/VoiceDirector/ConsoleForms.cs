using System.Globalization;
using System.Text.RegularExpressions;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.DevConsole.ConsoleCommands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Models;
using VoiceDirector.Contracts;
using VoiceDirector.Cards;
using MegaCrit.Sts2.Core.Logging;

namespace VoiceDirector;

public static class ConsoleForms
{
    private static string Human(string text) => CultureInfo.InvariantCulture.TextInfo.ToTitleCase(text.Replace('_', ' ').Replace('-', ' ').ToLowerInvariant());
    public static ConsoleArgument[] Arguments(AbstractConsoleCmd command, string[] values)
    {
        var tokens = Regex.Matches(command.Args, @"<[^>]+>|\[[^\]]+\]|[^\s]+")
            .Select(m => m.Value).ToList();
        if (tokens.Count == 2 && tokens[1] == "|'all'") tokens.RemoveAt(1);
        // These native usage strings omit defaults or differ from Process's positional grammar.
        if (command.CmdName == "leaderboard") tokens = ["<option:string>", "[name:string]", values.FirstOrDefault() == "random" ? "<count:int>" : "<score:int>"];
        if (command.CmdName == "getlogs") tokens = values.FirstOrDefault() == "test-feedback" ? ["[test-feedback]"] : ["[test-feedback]", "[name:string]"];
        var result = new List<ConsoleArgument>();
        for (var i = 0; i < tokens.Count; i++)
        {
            var token = tokens[i];
            var required = !token.StartsWith('[');
            var raw = token.Trim('<', '>', '[', ']');
            var parts = raw.Split(':', 2, StringSplitOptions.TrimEntries);
            var reversed = parts.Length == 2 && parts[0] is "int" or "string" or "int|string";
            var name = parts.Length == 2 ? parts[reversed ? 1 : 0] : raw.Contains('|') ? "option" : raw;
            var kind = parts.Length == 2 && parts[reversed ? 0 : 1] == "int" ? "number" : "text";
            var defaultValue = "";
            ConsoleOption[] options = [];
            if (name == "hand-index")
            {
                options = Director.Player is { } player ? PileType.Hand.GetPile(player).Cards.Select((c, index) => new ConsoleOption($"card:{Director.CombatId}:{Lineage.Get(c).Id}", $"{index + 1}. {c.Title}" )).ToArray() : [];
                defaultValue = options.FirstOrDefault()?.Value ?? "";
                name = "hand-index"; kind = "choice"; required = true;
            }
            else if (name == "target-index" || (name == "index" && command.CmdName == "heal"))
            {
                options = CombatManager.Instance.IsInProgress && CombatManager.Instance.DebugOnlyGetState() is { } combat ? combat.Creatures
                    .Select((c, index) => new ConsoleOption($"creature:{Director.CombatId}:{c.CombatId}", $"{c.Name} · {(c.IsPlayer ? "Player" : $"Enemy {combat.Creatures.Take(index + 1).Count(x => x.IsEnemy)}")} · {c.CurrentHp}/{c.MaxHp} HP")).ToArray() : [];
                if (command.CmdName == "kill") options = options.Append(new ConsoleOption("all", "All enemies")).ToArray();
                defaultValue = options.FirstOrDefault()?.Value ?? ""; kind = "choice"; required = true;
            }
            else
            {
                var prefix = Enumerable.Range(0, i).Select(n => n < values.Length && values[n].Length > 0 ? values[n] : result[n].DefaultValue).Append("").ToArray();
                options = command.GetArgumentCompletions(Director.Player, prefix).Candidates.Select(value => new ConsoleOption(value, Human(value))).ToArray();
                if (parts.Length == 1)
                {
                    options = raw.Split('|').Select(v => new ConsoleOption(v.Trim('\''), Human(v.Trim('\'')))).ToArray();
                    if (options.Length == 1 && token.StartsWith('[') && raw == "text") options = [];
                }
                if (command.CmdName == "afflict" && i == 0)
                    options = ModelDb.DebugAfflictions.Select(m => new ConsoleOption(m.Id.Entry, m.Title.GetFormattedText())).ToArray();
                if (command.CmdName == "enchant" && i == 0)
                    options = ModelDb.DebugEnchantments.Select(m => new ConsoleOption(m.Id.Entry, m.Title.GetFormattedText())).ToArray();
                if (command.CmdName == "log")
                {
                    options = (i == 0 ? Enum.GetNames<LogType>() : Enum.GetNames<LogLevel>()).Select(v => new ConsoleOption(v, Human(v))).ToArray();
                    if (i == 0) defaultValue = "Generic";
                }
                if (options.Length > 0) kind = "choice";
                if (command.CmdName == "leaderboard" && name == "name") defaultValue = "-";
                if (command.CmdName == "relic" && i == 0) defaultValue = "add";
                if (command.CmdName is "afflict" or "enchant" && name == "amount") defaultValue = "1";
            }
            var label = name switch { "hand-index" => "Card in hand", "target-index" or "index" => "Target", "pileName" => "Pile", "card-id" => "Card", "relic-id" => "Relic", "id" => command.CmdName switch { "afflict" => "Affliction", "enchant" => "Enchantment", "power" => "Power", _ => Human(command.CmdName) }, _ => Human(name) };
            result.Add(new(name, label, kind, required, defaultValue, options));
        }
        return result.ToArray();
    }
    public static string[] ResolveArguments(AbstractConsoleCmd command, string[] values)
    {
        var fields = Arguments(command, values);
        return values.Select((value, i) =>
        {
            if (!value.StartsWith("card:") && !value.StartsWith("creature:")) return value;
            if (i >= fields.Length || fields[i].Name is not ("hand-index" or "target-index" or "index"))
                throw new ArgumentException("An entity selection was supplied in the wrong field.");
            var index = Array.FindIndex(fields[i].Options, option => option.Value == value);
            if (index < 0) throw new InvalidOperationException($"The selected {fields[i].Label.ToLowerInvariant()} is no longer available. Choose it again.");
            return index.ToString();
        }).ToArray();
    }
}
