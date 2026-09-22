using System.Reflection;
using System.Runtime.Loader;
using MegaCrit.Sts2.Core.Modding;

namespace VoiceDirector.Bootstrap;

[ModInitializer(nameof(Initialize))]
public static class Loader
{
    public static void Initialize()
    {
        var directory = Path.GetDirectoryName(typeof(Loader).Assembly.Location)!;
        var context = AssemblyLoadContext.GetLoadContext(typeof(Loader).Assembly)!;
        context.Resolving += (_, name) =>
        {
            var path = Path.Combine(directory, name.Name + ".dll");
            return File.Exists(path) ? context.LoadFromAssemblyPath(path) : null;
        };
        var game = context.LoadFromAssemblyPath(Path.Combine(directory, "VoiceDirector.Game.dll"));
        game.GetType("VoiceDirector.Plugin", true)!.GetMethod("Initialize", BindingFlags.Public | BindingFlags.Static)!.Invoke(null, null);
    }
}
