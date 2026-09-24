using System.Diagnostics;
using System.Net.Http;
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
    private static bool _stopping;

    // The dashboard stays available between runs. Game state gates all AI work.
    private static async Task StartHostInterface(Launcher launcher)
    {
        try
        {
            Directory.CreateDirectory(LocalFiles.Root);
            if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(LocalFiles.Root, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
            var tokenPath = Path.Combine(LocalFiles.Root, "token");
            if (!File.Exists(tokenPath)) File.WriteAllText(tokenPath, Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant());
            if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(tokenPath, UnixFileMode.UserRead | UnixFileMode.UserWrite);
            var token = File.ReadAllText(tokenPath).Trim();
            await ApiHost.Start(new GamePort(), token);
            if (_stopping) { await ApiHost.Stop(); return; }
            using var http = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(2) };
            http.DefaultRequestHeaders.Authorization = new("Bearer", token);
            try
            {
                if ((await http.GetAsync("http://127.0.0.1:57543/api/health")).IsSuccessStatusCode) return;
            }
            catch (HttpRequestException) { }
            catch (TaskCanceledException) { }
            if (_stopping) return;
            var start = new ProcessStartInfo(launcher.Executable) { UseShellExecute = false, WorkingDirectory = launcher.WorkingDirectory };
            foreach (var argument in launcher.Arguments) start.ArgumentList.Add(argument);
            start.Environment["VOICE_DIRECTOR_DATA"] = LocalFiles.Root;
            using var companion = Process.Start(start);
            GD.Print("Voice Director dashboard: http://127.0.0.1:57543. AI waits for an active hosted run.");
        }
        catch (Exception e)
        {
            await ApiHost.Stop();
            GD.PrintErr("Voice Director dashboard could not start: " + e);
        }
    }

    public static void Shutdown()
    {
        _stopping = true;
        Voice.AmbientVoice.Detach();
        ApiHost.Stop().Wait(TimeSpan.FromSeconds(3));
    }

    public static void Initialize()
    {
        try
        {
            Lineage.Initialize();
            new Harmony("firat.voice-director").PatchAll(typeof(Plugin).Assembly);
            Voice.AmbientVoice.Initialize();
            if (LocalFiles.Read<Launcher>("launcher.json") is { } launcher) _ = StartHostInterface(launcher);
            ((SceneTree)Engine.GetMainLoop()).Root.TreeExiting += Shutdown;
            AppDomain.CurrentDomain.ProcessExit += (_, _) => Shutdown();
            GD.Print("Voice Director loaded. Friends need only the mod; the host companion handles generation.");
        }
        catch (Exception e) { GD.PrintErr("Voice Director initialization failed: " + e); }
    }
}

[HarmonyPatch(typeof(NGame), nameof(NGame.Quit))]
public static class QuitPatch
{
    public static void Prefix() => Plugin.Shutdown();
}
