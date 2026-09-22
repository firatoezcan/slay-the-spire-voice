using System.Reflection;
using NJsonSchema;
using VoiceDirector.Api;
using VoiceDirector.Contracts;

var folder = args.Length > 0 ? args[0] : "packages/contracts/schema";
Directory.CreateDirectory(folder);
await ApiHost.Start(DispatchProxy.Create<IGamePort, SchemaOnly>(), "schema-export", 57544);
using var http = new HttpClient();
var openApi = await http.GetStringAsync("http://127.0.0.1:57544/openapi.json");
await File.WriteAllTextAsync(Path.Combine(folder, "game.openapi.json"), openApi);
var schema = JsonSchema.FromType<CardDefinition>();
SchemaPolicy.Normalize(schema);
await File.WriteAllTextAsync(Path.Combine(folder, "card-definition.schema.json"), schema.ToJson());
Console.WriteLine("Exported game OpenAPI and card definition schema from C# contracts.");
Environment.Exit(0);

public class SchemaOnly : DispatchProxy
{
    protected override object? Invoke(MethodInfo? targetMethod, object?[]? args) => throw new InvalidOperationException("Contract export does not execute game operations.");
}
