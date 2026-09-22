export interface paths {
    "/state": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["game_Get_state"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/capabilities": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["game_Get_capabilities"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/definitions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["game_Get_definitions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cards/references": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["game_Get_cards_references"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cards/art-reference": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["game_Post_cards_art_reference"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cards/validate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["game_Post_cards_validate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["game_Get_events"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/operations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["game_Get_operations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/console/commands": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["game_Get_console_commands"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/console/complete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["game_Post_console_complete"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/console/arguments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["game_Post_console_arguments"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/console/execute": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["game_Post_console_execute"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/combat/play": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["game_Post_combat_play"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/combat/end-turn": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["game_Post_combat_end_turn"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/choices/select": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["game_Post_choices_select"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/potions/use": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["game_Post_potions_use"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/candidates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["game_Post_candidates"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cards/transform": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["game_Post_cards_transform"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cards/art": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["game_Post_cards_art"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/settings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["game_Put_settings"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cards/protection": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["game_Put_cards_protection"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        GameSnapshot: {
            runId: string;
            /** Format: int64 */
            revision: number;
            phase: string;
            /** Format: int32 */
            turn: number;
            cards: components["schemas"]["CardInstance"][];
            creatures: components["schemas"]["CreatureView"][];
            choices: components["schemas"]["ChoiceView"][];
            actions: string[];
            settings: components["schemas"]["DirectorSettings"];
            error: string | null;
        };
        CardInstance: {
            id: string;
            modelId: string;
            definitionId: string | null;
            name: string;
            rarity: string;
            type: string;
            /** Format: int32 */
            cost: number;
            /** Format: int32 */
            upgradeLevel: number;
            pile: string;
            description: string;
            wildcard: boolean;
            resolved: boolean;
            protected: boolean;
            /** Format: int32 */
            lastTransformedTurn: number;
        };
        CreatureView: {
            id: string;
            name: string;
            /** Format: decimal */
            health: number;
            /** Format: decimal */
            maxHealth: number;
            /** Format: decimal */
            block: number;
            enemy: boolean;
        };
        ChoiceView: {
            id: string;
            kind: string;
            label: string;
            enabled: boolean;
        };
        DirectorSettings: {
            mode: string;
            /** Format: double */
            drawChance: number;
            /** Format: int32 */
            maxPerTurn: number;
            /** Format: int32 */
            cooldownTurns: number;
            /** Format: double */
            strength: number;
            /** Format: double */
            synergy: number;
            enabled: boolean;
            debugConsole: boolean;
        };
        Capabilities: {
            gameVersion: string;
            connected: boolean;
            effects: string[];
            powers: string[];
            singlePlayerOnly: boolean;
        };
        CardDefinition: {
            id: string;
            name: string;
            rarity: string;
            type: string;
            target: string;
            /** Format: int32 */
            cost: number;
            effects: components["schemas"]["CardEffect"][];
            keywords: string[];
            theme: string;
            rationale: string;
            artPrompt: string;
            /** Format: double */
            quality: number;
        };
        CardEffect: {
            kind: string;
            /** Format: int32 */
            amount: number;
            target: string;
            power: string | null;
            /** Format: int32 */
            upgradeAmount: number;
            condition: string;
            /** Format: int32 */
            repeat: number;
        };
        CardReference: {
            modelId: string;
            name: string;
            pool: string;
            rarity: string;
            type: string;
            /** Format: int32 */
            cost: number;
            description: string;
            upgradeDescription: string;
            keywords: string[];
        };
        ArtReferenceRequest: {
            modelId: string;
        };
        ArtReferenceSheet: {
            pool: string;
            modelIds: string[];
            pngBase64: string;
        };
        CardValidation: {
            valid: boolean;
            error: string | null;
        };
        GameEvent: {
            id: string;
            runId: string;
            kind: string;
            instanceId: string | null;
            definitionId: string | null;
            message: string;
            /** Format: date-time */
            at: string;
        };
        Operation: {
            id: string;
            kind: string;
            status: string;
            error: string | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            completedAt: string | null;
        };
        ConsoleCommand: {
            name: string;
            arguments: string;
            description: string;
            debugOnly: boolean;
        };
        ConsoleCompletionRequest: {
            command: string;
            arguments: string[];
        };
        ConsoleArgument: {
            name: string;
            label: string;
            kind: string;
            required: boolean;
            defaultValue: string;
            options: components["schemas"]["ConsoleOption"][];
        };
        ConsoleOption: {
            value: string;
            label: string;
        };
        ConsoleRequest: {
            requestId: string;
            command: string;
            arguments: string[];
        };
        PlayRequest: {
            runId: string;
            requestId: string;
            instanceId: string;
            targetId: string | null;
        };
        ActionRequest: {
            runId: string;
            requestId: string;
        };
        ChoiceRequest: {
            runId: string;
            requestId: string;
            choiceId: string;
        };
        PotionRequest: {
            runId: string;
            requestId: string;
            /** Format: int32 */
            slot: number;
            targetId: string | null;
        };
        CandidateRequest: {
            runId: string;
            instanceId: string;
            definition: components["schemas"]["CardDefinition"];
            lucky: boolean;
        };
        TransformRequest: {
            runId: string;
            instanceId: string;
            definitionId: string;
            requestId: string;
        };
        ArtRequest: {
            definitionId: string;
            pngBase64: string;
        };
        ProtectionRequest: {
            instanceId: string;
            protected: boolean;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    game_Get_state: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GameSnapshot"];
                    "application/yaml": components["schemas"]["GameSnapshot"];
                    "application/x-www-form-urlencoded": components["schemas"]["GameSnapshot"];
                    "application/xml": components["schemas"]["GameSnapshot"];
                    "text/xml": components["schemas"]["GameSnapshot"];
                };
            };
            /** @description A response containing no body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    game_Get_capabilities: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Capabilities"];
                    "application/yaml": components["schemas"]["Capabilities"];
                    "application/x-www-form-urlencoded": components["schemas"]["Capabilities"];
                    "application/xml": components["schemas"]["Capabilities"];
                    "text/xml": components["schemas"]["Capabilities"];
                };
            };
            /** @description A response containing no body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    game_Get_definitions: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CardDefinition"][];
                    "application/yaml": components["schemas"]["CardDefinition"][];
                    "application/x-www-form-urlencoded": components["schemas"]["CardDefinition"][];
                    "application/xml": components["schemas"]["CardDefinition"][];
                    "text/xml": components["schemas"]["CardDefinition"][];
                };
            };
            /** @description A response containing no body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    game_Get_cards_references: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CardReference"][];
                    "application/yaml": components["schemas"]["CardReference"][];
                    "application/x-www-form-urlencoded": components["schemas"]["CardReference"][];
                    "application/xml": components["schemas"]["CardReference"][];
                    "text/xml": components["schemas"]["CardReference"][];
                };
            };
            /** @description A response containing no body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    game_Post_cards_art_reference: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["ArtReferenceRequest"];
                "application/yaml": components["schemas"]["ArtReferenceRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ArtReferenceRequest"];
                "application/xml": components["schemas"]["ArtReferenceRequest"];
                "text/xml": components["schemas"]["ArtReferenceRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ArtReferenceSheet"];
                    "application/yaml": components["schemas"]["ArtReferenceSheet"];
                    "application/x-www-form-urlencoded": components["schemas"]["ArtReferenceSheet"];
                    "application/xml": components["schemas"]["ArtReferenceSheet"];
                    "text/xml": components["schemas"]["ArtReferenceSheet"];
                };
            };
            /** @description A response containing no body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    game_Post_cards_validate: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["CardDefinition"];
                "application/yaml": components["schemas"]["CardDefinition"];
                "application/x-www-form-urlencoded": components["schemas"]["CardDefinition"];
                "application/xml": components["schemas"]["CardDefinition"];
                "text/xml": components["schemas"]["CardDefinition"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CardValidation"];
                    "application/yaml": components["schemas"]["CardValidation"];
                    "application/x-www-form-urlencoded": components["schemas"]["CardValidation"];
                    "application/xml": components["schemas"]["CardValidation"];
                    "text/xml": components["schemas"]["CardValidation"];
                };
            };
            /** @description A response containing no body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    game_Get_events: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GameEvent"][];
                    "application/yaml": components["schemas"]["GameEvent"][];
                    "application/x-www-form-urlencoded": components["schemas"]["GameEvent"][];
                    "application/xml": components["schemas"]["GameEvent"][];
                    "text/xml": components["schemas"]["GameEvent"][];
                };
            };
            /** @description A response containing no body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    game_Get_operations: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Operation"][];
                    "application/yaml": components["schemas"]["Operation"][];
                    "application/x-www-form-urlencoded": components["schemas"]["Operation"][];
                    "application/xml": components["schemas"]["Operation"][];
                    "text/xml": components["schemas"]["Operation"][];
                };
            };
            /** @description A response containing no body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    game_Get_console_commands: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConsoleCommand"][];
                    "application/yaml": components["schemas"]["ConsoleCommand"][];
                    "application/x-www-form-urlencoded": components["schemas"]["ConsoleCommand"][];
                    "application/xml": components["schemas"]["ConsoleCommand"][];
                    "text/xml": components["schemas"]["ConsoleCommand"][];
                };
            };
            /** @description A response containing no body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    game_Post_console_complete: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["ConsoleCompletionRequest"];
                "application/yaml": components["schemas"]["ConsoleCompletionRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ConsoleCompletionRequest"];
                "application/xml": components["schemas"]["ConsoleCompletionRequest"];
                "text/xml": components["schemas"]["ConsoleCompletionRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": string[];
                    "application/yaml": string[];
                    "application/x-www-form-urlencoded": string[];
                    "application/xml": string[];
                    "text/xml": string[];
                };
            };
            /** @description A response containing no body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    game_Post_console_arguments: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["ConsoleCompletionRequest"];
                "application/yaml": components["schemas"]["ConsoleCompletionRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ConsoleCompletionRequest"];
                "application/xml": components["schemas"]["ConsoleCompletionRequest"];
                "text/xml": components["schemas"]["ConsoleCompletionRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConsoleArgument"][];
                    "application/yaml": components["schemas"]["ConsoleArgument"][];
                    "application/x-www-form-urlencoded": components["schemas"]["ConsoleArgument"][];
                    "application/xml": components["schemas"]["ConsoleArgument"][];
                    "text/xml": components["schemas"]["ConsoleArgument"][];
                };
            };
            /** @description A response containing no body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    game_Post_console_execute: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["ConsoleRequest"];
                "application/yaml": components["schemas"]["ConsoleRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ConsoleRequest"];
                "application/xml": components["schemas"]["ConsoleRequest"];
                "text/xml": components["schemas"]["ConsoleRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Operation"];
                    "application/yaml": components["schemas"]["Operation"];
                    "application/x-www-form-urlencoded": components["schemas"]["Operation"];
                    "application/xml": components["schemas"]["Operation"];
                    "text/xml": components["schemas"]["Operation"];
                };
            };
            /** @description A response containing no body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    game_Post_combat_play: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PlayRequest"];
                "application/yaml": components["schemas"]["PlayRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PlayRequest"];
                "application/xml": components["schemas"]["PlayRequest"];
                "text/xml": components["schemas"]["PlayRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Operation"];
                    "application/yaml": components["schemas"]["Operation"];
                    "application/x-www-form-urlencoded": components["schemas"]["Operation"];
                    "application/xml": components["schemas"]["Operation"];
                    "text/xml": components["schemas"]["Operation"];
                };
            };
            /** @description A response containing no body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    game_Post_combat_end_turn: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["ActionRequest"];
                "application/yaml": components["schemas"]["ActionRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ActionRequest"];
                "application/xml": components["schemas"]["ActionRequest"];
                "text/xml": components["schemas"]["ActionRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Operation"];
                    "application/yaml": components["schemas"]["Operation"];
                    "application/x-www-form-urlencoded": components["schemas"]["Operation"];
                    "application/xml": components["schemas"]["Operation"];
                    "text/xml": components["schemas"]["Operation"];
                };
            };
            /** @description A response containing no body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    game_Post_choices_select: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["ChoiceRequest"];
                "application/yaml": components["schemas"]["ChoiceRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ChoiceRequest"];
                "application/xml": components["schemas"]["ChoiceRequest"];
                "text/xml": components["schemas"]["ChoiceRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Operation"];
                    "application/yaml": components["schemas"]["Operation"];
                    "application/x-www-form-urlencoded": components["schemas"]["Operation"];
                    "application/xml": components["schemas"]["Operation"];
                    "text/xml": components["schemas"]["Operation"];
                };
            };
            /** @description A response containing no body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    game_Post_potions_use: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PotionRequest"];
                "application/yaml": components["schemas"]["PotionRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PotionRequest"];
                "application/xml": components["schemas"]["PotionRequest"];
                "text/xml": components["schemas"]["PotionRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Operation"];
                    "application/yaml": components["schemas"]["Operation"];
                    "application/x-www-form-urlencoded": components["schemas"]["Operation"];
                    "application/xml": components["schemas"]["Operation"];
                    "text/xml": components["schemas"]["Operation"];
                };
            };
            /** @description A response containing no body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    game_Post_candidates: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["CandidateRequest"];
                "application/yaml": components["schemas"]["CandidateRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["CandidateRequest"];
                "application/xml": components["schemas"]["CandidateRequest"];
                "text/xml": components["schemas"]["CandidateRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Operation"];
                    "application/yaml": components["schemas"]["Operation"];
                    "application/x-www-form-urlencoded": components["schemas"]["Operation"];
                    "application/xml": components["schemas"]["Operation"];
                    "text/xml": components["schemas"]["Operation"];
                };
            };
            /** @description A response containing no body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    game_Post_cards_transform: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["TransformRequest"];
                "application/yaml": components["schemas"]["TransformRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["TransformRequest"];
                "application/xml": components["schemas"]["TransformRequest"];
                "text/xml": components["schemas"]["TransformRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Operation"];
                    "application/yaml": components["schemas"]["Operation"];
                    "application/x-www-form-urlencoded": components["schemas"]["Operation"];
                    "application/xml": components["schemas"]["Operation"];
                    "text/xml": components["schemas"]["Operation"];
                };
            };
            /** @description A response containing no body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    game_Post_cards_art: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["ArtRequest"];
                "application/yaml": components["schemas"]["ArtRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ArtRequest"];
                "application/xml": components["schemas"]["ArtRequest"];
                "text/xml": components["schemas"]["ArtRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Operation"];
                    "application/yaml": components["schemas"]["Operation"];
                    "application/x-www-form-urlencoded": components["schemas"]["Operation"];
                    "application/xml": components["schemas"]["Operation"];
                    "text/xml": components["schemas"]["Operation"];
                };
            };
            /** @description A response containing no body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    game_Put_settings: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["DirectorSettings"];
                "application/yaml": components["schemas"]["DirectorSettings"];
                "application/x-www-form-urlencoded": components["schemas"]["DirectorSettings"];
                "application/xml": components["schemas"]["DirectorSettings"];
                "text/xml": components["schemas"]["DirectorSettings"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DirectorSettings"];
                    "application/yaml": components["schemas"]["DirectorSettings"];
                    "application/x-www-form-urlencoded": components["schemas"]["DirectorSettings"];
                    "application/xml": components["schemas"]["DirectorSettings"];
                    "text/xml": components["schemas"]["DirectorSettings"];
                };
            };
            /** @description A response containing no body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    game_Put_cards_protection: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["ProtectionRequest"];
                "application/yaml": components["schemas"]["ProtectionRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ProtectionRequest"];
                "application/xml": components["schemas"]["ProtectionRequest"];
                "text/xml": components["schemas"]["ProtectionRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CardInstance"];
                    "application/yaml": components["schemas"]["CardInstance"];
                    "application/x-www-form-urlencoded": components["schemas"]["CardInstance"];
                    "application/xml": components["schemas"]["CardInstance"];
                    "text/xml": components["schemas"]["CardInstance"];
                };
            };
            /** @description A response containing no body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
}
