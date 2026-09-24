using Godot;
using HarmonyLib;
using MegaCrit.Sts2.Core.Nodes.Screens.Settings;
using VoiceDirector.Contracts;

namespace VoiceDirector.Voice;

[HarmonyPatch(typeof(NSettingsScreen), nameof(NSettingsScreen._Ready))]
public static class VoiceSettingsUi
{
    public static void Postfix(NSettingsScreen __instance)
    {
        var content = __instance.GetNode<NSettingsPanel>("%SoundSettings").Content;
        var group = new VBoxContainer { Name = "VoiceDirectorMicrophone", CustomMinimumSize = new Vector2(0, 140) };
        group.AddThemeConstantOverride("separation", 12);
        var toggle = new CheckButton { Text = "Use my microphone for Voice Director", ButtonPressed = AmbientVoice.Status().Enabled };
        toggle.AddThemeFontSizeOverride("font_size", 26);
        var explanation = new Label {
            Text = "Listens during a run. Audio goes to the host for local transcription.\nThe host sends recent conversation to Codex to decide when to create cards.",
            AutowrapMode = TextServer.AutowrapMode.WordSmart,
            CustomMinimumSize = new Vector2(0, 68),
        };
        explanation.AddThemeFontSizeOverride("font_size", 22);
        toggle.Toggled += enabled => AmbientVoice.Configure(new VoiceSettings(enabled));
        group.AddChild(toggle); group.AddChild(explanation); content.AddChild(group);
        content.MoveChild(group, 0);
        var timer = new Godot.Timer { WaitTime = 0.5, Autostart = true };
        timer.Timeout += () => {
            if (!group.IsVisibleInTree()) return;
            var status = AmbientVoice.Status();
            toggle.SetPressedNoSignal(status.Enabled);
            explanation.Text = status.Error is { } error ? error + "\nCheck Steam microphone settings, then turn this switch off and on."
                : "Listens during a run. Audio goes to the host for local transcription.\nThe host sends recent conversation to Codex to decide when to create cards.";
        };
        group.AddChild(timer);
    }
}
