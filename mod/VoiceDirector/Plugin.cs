using System.Diagnostics;
using RandomNumberGenerator = System.Security.Cryptography.RandomNumberGenerator;
using Godot;
using HarmonyLib;
using MegaCrit.Sts2.Core.Modding;
using MegaCrit.Sts2.Core.Nodes;
using VoiceDirector.Api;
using VoiceDirector.Cards;

namespace VoiceDirector;

[ModInitializer(nameof(Initialize))]
public static class Plugin
{
    private sealed record Launcher(string Executable, string[] Arguments, string WorkingDirectory);
    private static Process? _companion;
    private static int _stopping;
    public static void Shutdown()
    {
        if (Interlocked.Exchange(ref _stopping, 1) != 0) return;
        try { if (_companion is { HasExited: false }) _companion.Kill(true); }
        catch (InvalidOperationException) { }
        ApiHost.Stop().Wait(TimeSpan.FromSeconds(2));
    }
    public static void Initialize()
    {
        Directory.CreateDirectory(LocalFiles.Root);
        if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(LocalFiles.Root, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        var tokenPath = Path.Combine(LocalFiles.Root, "token");
        if (!File.Exists(tokenPath)) File.WriteAllText(tokenPath, Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant());
        if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(tokenPath, UnixFileMode.UserRead | UnixFileMode.UserWrite);
        try
        {
            Lineage.Initialize();
            new Harmony("firat.voice-director").PatchAll(typeof(Plugin).Assembly);
            _ = ApiHost.Start(new GamePort(), File.ReadAllText(tokenPath).Trim()).ContinueWith(t =>
            { if (t.IsFaulted) GD.PrintErr("Voice Director API: " + t.Exception); });
            if (LocalFiles.Read<Launcher>("launcher.json") is { } launcher)
            {
                var start = new ProcessStartInfo(launcher.Executable) { UseShellExecute = false, WorkingDirectory = launcher.WorkingDirectory };
                foreach (var argument in launcher.Arguments) start.ArgumentList.Add(argument);
                start.Environment["VOICE_DIRECTOR_DATA"] = LocalFiles.Root;
                _companion = Process.Start(start);
            }
            ((SceneTree)Engine.GetMainLoop()).Root.TreeExiting += Shutdown;
            AppDomain.CurrentDomain.ProcessExit += (_, _) => Shutdown();
            GD.Print("Voice Director loaded. Dashboard: http://127.0.0.1:57543");
        }
        catch (Exception e) { GD.PrintErr("Voice Director initialization failed: " + e); }
    }
}

[HarmonyPatch(typeof(NGame), nameof(NGame.Quit))]
public static class QuitPatch
{
    public static void Prefix() => Plugin.Shutdown();
}
