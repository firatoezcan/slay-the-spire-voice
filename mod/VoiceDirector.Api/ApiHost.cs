using System.Net;
using GenHTTP.Api.Content;
using GenHTTP.Api.Protocol;
using GenHTTP.Api.Infrastructure;
using GenHTTP.Engine.Internal;
using GenHTTP.Modules.Functional;
using GenHTTP.Modules.OpenApi;
using GenHTTP.Modules.Practices;
using GenHTTP.Modules.Conversion;
using System.Text.Json;
using VoiceDirector.Contracts;

namespace VoiceDirector.Api;

public static class ApiHost
{
    private static IServerHost? _host;
    public static async Task Stop()
    {
        var host = Interlocked.Exchange(ref _host, null);
        if (host is not null) await host.StopAsync();
    }
    public static async Task Start(IGamePort game, string token, int port = 57542)
    {
        Task<T> Authorized<T>(IRequest request, Func<Task<T>> call)
        {
            if (!request.Headers.TryGetValue("Authorization", out var value) || value != $"Bearer {token}")
                throw new ProviderException(ResponseStatus.Unauthorized, "Local API token required.");
            if (request.Headers.ContainsKey("Origin"))
                throw new ProviderException(ResponseStatus.Forbidden, "Use the companion API from browsers.");
            return call();
        }
        var routes = Inline.Create().Serializers(Serialization.Default(new JsonSerializerOptions(JsonSerializerDefaults.Web)))
            .Get("/state", (IRequest r) => Authorized(r, game.Snapshot))
            .Get("/capabilities", (IRequest r) => Authorized(r, game.Capabilities))
            .Get("/definitions", (IRequest r) => Authorized(r, game.Definitions))
            .Get("/cards/references", (IRequest r) => Authorized(r, game.CardReferences))
            .Post("/cards/art-reference", (IRequest r, ArtReferenceRequest body) => Authorized(r, () => game.ArtReference(body)))
            .Post("/cards/validate", (IRequest r, CardDefinition body) => Authorized(r, () => game.ValidateCard(body)))
            .Get("/events", (IRequest r) => Authorized(r, game.Events))
            .Get("/operations", (IRequest r) => Authorized(r, game.Operations))
            .Get("/console/commands", (IRequest r) => Authorized(r, game.ConsoleCommands))
            .Post("/console/complete", (IRequest r, ConsoleCompletionRequest body) => Authorized(r, () => game.Complete(body)))
            .Post("/console/arguments", (IRequest r, ConsoleCompletionRequest body) => Authorized(r, () => game.ConsoleArguments(body)))
            .Post("/console/execute", (IRequest r, ConsoleRequest body) => Authorized(r, () => game.Console(body)))
            .Post("/combat/play", (IRequest r, PlayRequest body) => Authorized(r, () => game.Play(body)))
            .Post("/combat/end-turn", (IRequest r, ActionRequest body) => Authorized(r, () => game.EndTurn(body)))
            .Post("/choices/select", (IRequest r, ChoiceRequest body) => Authorized(r, () => game.Choose(body)))
            .Post("/potions/use", (IRequest r, PotionRequest body) => Authorized(r, () => game.UsePotion(body)))
            .Post("/candidates", (IRequest r, CandidateRequest body) => Authorized(r, () => game.Prepare(body)))
            .Post("/cards/transform", (IRequest r, TransformRequest body) => Authorized(r, () => game.Transform(body)))
            .Post("/cards/art", (IRequest r, ArtRequest body) => Authorized(r, () => game.Art(body)))
            .Put("/settings", (IRequest r, DirectorSettings body) => Authorized(r, () => game.Configure(body)))
            .Put("/cards/protection", (IRequest r, ProtectionRequest body) => Authorized(r, () => game.Protect(body)))
            .Add(ApiDescription.Create().Title("Voice Director Game API").Version("1.0.0").PostProcessor((_, document) =>
            {
                foreach (var schema in document.Definitions.Values) SchemaPolicy.Normalize(schema);
                foreach (var operation in document.Operations)
                    operation.Operation.OperationId = "game_" + operation.Method + "_" + operation.Path.Trim('/').Replace('/', '_').Replace('-', '_');
            }));
        _host = Host.Create().Bind(IPAddress.Loopback, (ushort)port).Handler(routes).Defaults();
        await _host.StartAsync();
    }
}
