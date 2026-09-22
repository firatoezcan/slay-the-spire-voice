using System.Text.Json;
using NJsonSchema;
using VoiceDirector.Contracts;

namespace VoiceDirector.Api;

public static class SchemaPolicy
{
    public static void Normalize(JsonSchema root)
    {
        var visited = new HashSet<JsonSchema>();
        void Visit(JsonSchema? schema)
        {
            if (schema is null || !visited.Add(schema)) return;
            foreach (var (name, property) in schema.Properties.ToArray())
            {
                var camel = JsonNamingPolicy.CamelCase.ConvertName(name);
                schema.Properties.Remove(name);
                schema.Properties.Add(camel, property);
                schema.RequiredProperties.Remove(name);
                schema.RequiredProperties.Add(camel);
                Visit(property);
            }
            foreach (var value in schema.Definitions.Values) Visit(value);
            foreach (var value in schema.AllOf.Concat(schema.AnyOf).Concat(schema.OneOf)) Visit(value);
            Visit(schema.Reference); Visit(schema.Item);
        }
        Visit(root);
    }
}
