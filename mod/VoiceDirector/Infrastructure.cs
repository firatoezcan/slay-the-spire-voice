using System.Text.Json;
using Godot;
using MegaCrit.Sts2.Core.Nodes.GodotExtensions;
using Environment = System.Environment;

namespace VoiceDirector;

public static class LocalFiles
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { WriteIndented = true };
    public static readonly string Root = Environment.GetEnvironmentVariable("VOICE_DIRECTOR_DATA") ??
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".local", "share", "slay-the-spire-voice");
    public static void Write<T>(string name, T value)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(Path.Combine(Root, name))!);
        var file = Path.Combine(Root, name);
        File.WriteAllText(file + ".pending", JsonSerializer.Serialize(value, Json));
        File.Move(file + ".pending", file, true);
    }
    public static T? Read<T>(string name) => File.Exists(Path.Combine(Root, name))
        ? JsonSerializer.Deserialize<T>(File.ReadAllText(Path.Combine(Root, name)), Json) : default;
}

public static class GameThread
{
    public static Task<T> Run<T>(Func<T> action)
    {
        var result = new TaskCompletionSource<T>(TaskCreationOptions.RunContinuationsAsynchronously);
        Callable.From(() => { try { result.TrySetResult(action()); } catch (Exception e) { result.TrySetException(e); } }).CallDeferred();
        return result.Task.WaitAsync(TimeSpan.FromSeconds(15));
    }
    public static Task<T> RunAsync<T>(Func<Task<T>> action)
    {
        var result = new TaskCompletionSource<T>(TaskCreationOptions.RunContinuationsAsynchronously);
        Callable.From((Action)(async () => { try { result.TrySetResult(await action()); } catch (Exception e) { result.TrySetException(e); } })).CallDeferred();
        return result.Task;
    }
}
