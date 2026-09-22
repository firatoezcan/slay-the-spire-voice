export interface paths {
    "/api/session": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["createSession"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getHealth"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/state": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getState"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/runs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listRuns"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/jobs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listJobs"];
        put?: never;
        post: operations["createCardJob"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/jobs/{id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["cancelJob"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/jobs/{id}/retry": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["retryJob"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/transcripts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listTranscripts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/inspiration": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["addInspiration"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/voice/utterances": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["transcribeUtterance"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listEvents"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/definitions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listDefinitions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/provider": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getProviderSettings"];
        put: operations["setProviderSettings"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/art/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getArtwork"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/game/state": {
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
    "/api/game/capabilities": {
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
    "/api/game/definitions": {
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
    "/api/game/cards/references": {
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
    "/api/game/cards/art-reference": {
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
    "/api/game/cards/validate": {
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
    "/api/game/events": {
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
    "/api/game/operations": {
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
    "/api/game/console/commands": {
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
    "/api/game/console/complete": {
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
    "/api/game/console/arguments": {
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
    "/api/game/console/execute": {
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
    "/api/game/combat/play": {
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
    "/api/game/combat/end-turn": {
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
    "/api/game/choices/select": {
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
    "/api/game/potions/use": {
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
    "/api/game/candidates": {
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
    "/api/game/cards/transform": {
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
    "/api/game/cards/art": {
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
    "/api/game/settings": {
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
    "/api/game/cards/protection": {
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
    schemas: never;
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    createSession: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        ok: boolean;
                    };
                };
            };
        };
    };
    getHealth: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @constant */
                        id: "health";
                        game: boolean;
                        error: ((string | null) | null) | null;
                        speech: {
                            model: string;
                            modelDir: string;
                            ready: boolean;
                            busy: boolean;
                            missing: string[];
                        };
                    };
                };
            };
        };
    };
    getState: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        runId: string;
                        revision: string | number;
                        phase: string;
                        turn: string | number;
                        cards: {
                            id: string;
                            modelId: string;
                            definitionId: string | null;
                            name: string;
                            rarity: string;
                            type: string;
                            cost: string | number;
                            upgradeLevel: string | number;
                            pile: string;
                            description: string;
                            wildcard: boolean;
                            resolved: boolean;
                            protected: boolean;
                            lastTransformedTurn: string | number;
                        }[];
                        creatures: {
                            id: string;
                            name: string;
                            health: number;
                            maxHealth: number;
                            block: number;
                            enemy: boolean;
                        }[];
                        choices: {
                            id: string;
                            kind: string;
                            label: string;
                            enabled: boolean;
                        }[];
                        actions: string[];
                        settings: {
                            mode: string;
                            drawChance: number;
                            maxPerTurn: string | number;
                            cooldownTurns: string | number;
                            strength: number;
                            synergy: number;
                            enabled: boolean;
                            debugConsole: boolean;
                        };
                        error: string | null;
                    } | null;
                };
            };
        };
    };
    listRuns: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        runId: string;
                        revision: string | number;
                        phase: string;
                        turn: string | number;
                        cards: {
                            id: string;
                            modelId: string;
                            definitionId: string | null;
                            name: string;
                            rarity: string;
                            type: string;
                            cost: string | number;
                            upgradeLevel: string | number;
                            pile: string;
                            description: string;
                            wildcard: boolean;
                            resolved: boolean;
                            protected: boolean;
                            lastTransformedTurn: string | number;
                        }[];
                        creatures: {
                            id: string;
                            name: string;
                            health: number;
                            maxHealth: number;
                            block: number;
                            enemy: boolean;
                        }[];
                        choices: {
                            id: string;
                            kind: string;
                            label: string;
                            enabled: boolean;
                        }[];
                        actions: string[];
                        settings: {
                            mode: string;
                            drawChance: number;
                            maxPerTurn: string | number;
                            cooldownTurns: string | number;
                            strength: number;
                            synergy: number;
                            enabled: boolean;
                            debugConsole: boolean;
                        };
                        error: string | null;
                        id: string;
                    }[];
                };
            };
        };
    };
    listJobs: {
        parameters: {
            query?: {
                runId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id: string;
                        runId: string;
                        /** @enum {string} */
                        kind: "card" | "art";
                        status: string;
                        instanceId: string;
                        definitionId: ((string | null) | null) | null;
                        lucky: boolean;
                        immediate: boolean;
                        createdAt: string;
                        completedAt: ((string | null) | null) | null;
                        error: ((string | null) | null) | null;
                        result: ((string | null) | null) | null;
                    }[];
                };
            };
        };
    };
    createCardJob: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    instanceId: string;
                    /** @default false */
                    lucky: boolean;
                    /** @default false */
                    immediate: boolean;
                };
                "application/x-www-form-urlencoded": {
                    instanceId: string;
                    /** @default false */
                    lucky: boolean;
                    /** @default false */
                    immediate: boolean;
                };
                "multipart/form-data": {
                    instanceId: string;
                    /** @default false */
                    lucky: boolean;
                    /** @default false */
                    immediate: boolean;
                };
            };
        };
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id: string;
                        runId: string;
                        /** @enum {string} */
                        kind: "card" | "art";
                        status: string;
                        instanceId: string;
                        definitionId: ((string | null) | null) | null;
                        lucky: boolean;
                        immediate: boolean;
                        createdAt: string;
                        completedAt: ((string | null) | null) | null;
                        error: ((string | null) | null) | null;
                        result: ((string | null) | null) | null;
                    };
                };
            };
        };
    };
    cancelJob: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id: string;
                        runId: string;
                        /** @enum {string} */
                        kind: "card" | "art";
                        status: string;
                        instanceId: string;
                        definitionId: ((string | null) | null) | null;
                        lucky: boolean;
                        immediate: boolean;
                        createdAt: string;
                        completedAt: ((string | null) | null) | null;
                        error: ((string | null) | null) | null;
                        result: ((string | null) | null) | null;
                    };
                };
            };
        };
    };
    retryJob: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id: string;
                        runId: string;
                        /** @enum {string} */
                        kind: "card" | "art";
                        status: string;
                        instanceId: string;
                        definitionId: ((string | null) | null) | null;
                        lucky: boolean;
                        immediate: boolean;
                        createdAt: string;
                        completedAt: ((string | null) | null) | null;
                        error: ((string | null) | null) | null;
                        result: ((string | null) | null) | null;
                    };
                };
            };
        };
    };
    listTranscripts: {
        parameters: {
            query?: {
                runId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id: string;
                        runId: string;
                        text: string;
                        source: string;
                        mood: string;
                        createdAt: string;
                    }[];
                };
            };
        };
    };
    addInspiration: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    text: string;
                    /** @enum {string} */
                    source: "microphone" | "chat" | "tts" | "manual";
                    mood?: string;
                };
                "application/x-www-form-urlencoded": {
                    text: string;
                    /** @enum {string} */
                    source: "microphone" | "chat" | "tts" | "manual";
                    mood?: string;
                };
                "multipart/form-data": {
                    text: string;
                    /** @enum {string} */
                    source: "microphone" | "chat" | "tts" | "manual";
                    mood?: string;
                };
            };
        };
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id: string;
                        runId: string;
                        text: string;
                        source: string;
                        mood: string;
                        createdAt: string;
                    };
                };
            };
        };
    };
    transcribeUtterance: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    samples: number[];
                };
                "application/x-www-form-urlencoded": {
                    samples: number[];
                };
                "multipart/form-data": {
                    samples: number[];
                };
            };
        };
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id: string;
                        runId: string;
                        text: string;
                        source: string;
                        mood: string;
                        createdAt: string;
                    } | null;
                };
            };
        };
    };
    listEvents: {
        parameters: {
            query?: {
                runId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id: string;
                        runId: string;
                        kind: string;
                        instanceId: string | null;
                        definitionId: string | null;
                        message: string;
                        at: string;
                    }[];
                };
            };
        };
    };
    listDefinitions: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id: string;
                        name: string;
                        rarity: string;
                        type: string;
                        target: string;
                        cost: string | number;
                        effects: {
                            kind: string;
                            amount: string | number;
                            target: string;
                            power: string | null;
                            upgradeAmount: string | number;
                            condition: string;
                            repeat: string | number;
                        }[];
                        keywords: string[];
                        theme: string;
                        rationale: string;
                        artPrompt: string;
                        quality: number;
                    }[];
                };
            };
        };
    };
    getProviderSettings: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @constant */
                        id: "provider";
                        model: string;
                        modelDir: string;
                        autoPrepare: boolean;
                        cardTimeoutMs: string | number;
                        artTimeoutMs: string | number;
                    };
                };
            };
        };
    };
    setProviderSettings: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @constant */
                    id: "provider";
                    model: string;
                    modelDir: string;
                    autoPrepare: boolean;
                    cardTimeoutMs: string | number;
                    artTimeoutMs: string | number;
                };
                "application/x-www-form-urlencoded": {
                    /** @constant */
                    id: "provider";
                    model: string;
                    modelDir: string;
                    autoPrepare: boolean;
                    cardTimeoutMs: string | number;
                    artTimeoutMs: string | number;
                };
                "multipart/form-data": {
                    /** @constant */
                    id: "provider";
                    model: string;
                    modelDir: string;
                    autoPrepare: boolean;
                    cardTimeoutMs: string | number;
                    artTimeoutMs: string | number;
                };
            };
        };
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @constant */
                        id: "provider";
                        model: string;
                        modelDir: string;
                        autoPrepare: boolean;
                        cardTimeoutMs: string | number;
                        artTimeoutMs: string | number;
                    };
                };
            };
        };
    };
    getArtwork: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: never;
    };
    game_Get_state: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        runId: string;
                        revision: string | number;
                        phase: string;
                        turn: string | number;
                        cards: {
                            id: string;
                            modelId: string;
                            definitionId: string | null;
                            name: string;
                            rarity: string;
                            type: string;
                            cost: string | number;
                            upgradeLevel: string | number;
                            pile: string;
                            description: string;
                            wildcard: boolean;
                            resolved: boolean;
                            protected: boolean;
                            lastTransformedTurn: string | number;
                        }[];
                        creatures: {
                            id: string;
                            name: string;
                            health: number;
                            maxHealth: number;
                            block: number;
                            enemy: boolean;
                        }[];
                        choices: {
                            id: string;
                            kind: string;
                            label: string;
                            enabled: boolean;
                        }[];
                        actions: string[];
                        settings: {
                            mode: string;
                            drawChance: number;
                            maxPerTurn: string | number;
                            cooldownTurns: string | number;
                            strength: number;
                            synergy: number;
                            enabled: boolean;
                            debugConsole: boolean;
                        };
                        error: string | null;
                    };
                };
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
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        gameVersion: string;
                        connected: boolean;
                        effects: string[];
                        powers: string[];
                        singlePlayerOnly: boolean;
                    };
                };
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
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id: string;
                        name: string;
                        rarity: string;
                        type: string;
                        target: string;
                        cost: string | number;
                        effects: {
                            kind: string;
                            amount: string | number;
                            target: string;
                            power: string | null;
                            upgradeAmount: string | number;
                            condition: string;
                            repeat: string | number;
                        }[];
                        keywords: string[];
                        theme: string;
                        rationale: string;
                        artPrompt: string;
                        quality: number;
                    }[];
                };
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
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        modelId: string;
                        name: string;
                        pool: string;
                        rarity: string;
                        type: string;
                        cost: string | number;
                        description: string;
                        upgradeDescription: string;
                        keywords: string[];
                    }[];
                };
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
        requestBody: {
            content: {
                "application/json": {
                    modelId: string;
                };
                "application/x-www-form-urlencoded": {
                    modelId: string;
                };
                "multipart/form-data": {
                    modelId: string;
                };
            };
        };
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        pool: string;
                        modelIds: string[];
                        pngBase64: string;
                    };
                };
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
        requestBody: {
            content: {
                "application/json": {
                    id: string;
                    name: string;
                    rarity: string;
                    type: string;
                    target: string;
                    cost: string | number;
                    effects: {
                        kind: string;
                        amount: string | number;
                        target: string;
                        power: string | null;
                        upgradeAmount: string | number;
                        condition: string;
                        repeat: string | number;
                    }[];
                    keywords: string[];
                    theme: string;
                    rationale: string;
                    artPrompt: string;
                    quality: number;
                };
                "application/x-www-form-urlencoded": {
                    id: string;
                    name: string;
                    rarity: string;
                    type: string;
                    target: string;
                    cost: string | number;
                    effects: {
                        kind: string;
                        amount: string | number;
                        target: string;
                        power: string | null;
                        upgradeAmount: string | number;
                        condition: string;
                        repeat: string | number;
                    }[];
                    keywords: string[];
                    theme: string;
                    rationale: string;
                    artPrompt: string;
                    quality: number;
                };
                "multipart/form-data": {
                    id: string;
                    name: string;
                    rarity: string;
                    type: string;
                    target: string;
                    cost: string | number;
                    effects: {
                        kind: string;
                        amount: string | number;
                        target: string;
                        power: string | null;
                        upgradeAmount: string | number;
                        condition: string;
                        repeat: string | number;
                    }[];
                    keywords: string[];
                    theme: string;
                    rationale: string;
                    artPrompt: string;
                    quality: number;
                };
            };
        };
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        valid: boolean;
                        error: string | null;
                    };
                };
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
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id: string;
                        runId: string;
                        kind: string;
                        instanceId: string | null;
                        definitionId: string | null;
                        message: string;
                        at: string;
                    }[];
                };
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
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id: string;
                        kind: string;
                        status: string;
                        error: string | null;
                        createdAt: string;
                        completedAt: string | null;
                    }[];
                };
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
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        name: string;
                        arguments: string;
                        description: string;
                        debugOnly: boolean;
                    }[];
                };
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
        requestBody: {
            content: {
                "application/json": {
                    command: string;
                    arguments: string[];
                };
                "application/x-www-form-urlencoded": {
                    command: string;
                    arguments: string[];
                };
                "multipart/form-data": {
                    command: string;
                    arguments: string[];
                };
            };
        };
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": string[];
                };
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
        requestBody: {
            content: {
                "application/json": {
                    command: string;
                    arguments: string[];
                };
                "application/x-www-form-urlencoded": {
                    command: string;
                    arguments: string[];
                };
                "multipart/form-data": {
                    command: string;
                    arguments: string[];
                };
            };
        };
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        name: string;
                        label: string;
                        kind: string;
                        required: boolean;
                        defaultValue: string;
                        options: {
                            value: string;
                            label: string;
                        }[];
                    }[];
                };
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
        requestBody: {
            content: {
                "application/json": {
                    requestId: string;
                    command: string;
                    arguments: string[];
                };
                "application/x-www-form-urlencoded": {
                    requestId: string;
                    command: string;
                    arguments: string[];
                };
                "multipart/form-data": {
                    requestId: string;
                    command: string;
                    arguments: string[];
                };
            };
        };
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id: string;
                        kind: string;
                        status: string;
                        error: string | null;
                        createdAt: string;
                        completedAt: string | null;
                    };
                };
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
        requestBody: {
            content: {
                "application/json": {
                    runId: string;
                    requestId: string;
                    instanceId: string;
                    targetId: string | null;
                };
                "application/x-www-form-urlencoded": {
                    runId: string;
                    requestId: string;
                    instanceId: string;
                    targetId: string | null;
                };
                "multipart/form-data": {
                    runId: string;
                    requestId: string;
                    instanceId: string;
                    targetId: string | null;
                };
            };
        };
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id: string;
                        kind: string;
                        status: string;
                        error: string | null;
                        createdAt: string;
                        completedAt: string | null;
                    };
                };
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
        requestBody: {
            content: {
                "application/json": {
                    runId: string;
                    requestId: string;
                };
                "application/x-www-form-urlencoded": {
                    runId: string;
                    requestId: string;
                };
                "multipart/form-data": {
                    runId: string;
                    requestId: string;
                };
            };
        };
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id: string;
                        kind: string;
                        status: string;
                        error: string | null;
                        createdAt: string;
                        completedAt: string | null;
                    };
                };
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
        requestBody: {
            content: {
                "application/json": {
                    runId: string;
                    requestId: string;
                    choiceId: string;
                };
                "application/x-www-form-urlencoded": {
                    runId: string;
                    requestId: string;
                    choiceId: string;
                };
                "multipart/form-data": {
                    runId: string;
                    requestId: string;
                    choiceId: string;
                };
            };
        };
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id: string;
                        kind: string;
                        status: string;
                        error: string | null;
                        createdAt: string;
                        completedAt: string | null;
                    };
                };
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
        requestBody: {
            content: {
                "application/json": {
                    runId: string;
                    requestId: string;
                    slot: string | number;
                    targetId: string | null;
                };
                "application/x-www-form-urlencoded": {
                    runId: string;
                    requestId: string;
                    slot: string | number;
                    targetId: string | null;
                };
                "multipart/form-data": {
                    runId: string;
                    requestId: string;
                    slot: string | number;
                    targetId: string | null;
                };
            };
        };
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id: string;
                        kind: string;
                        status: string;
                        error: string | null;
                        createdAt: string;
                        completedAt: string | null;
                    };
                };
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
        requestBody: {
            content: {
                "application/json": {
                    runId: string;
                    instanceId: string;
                    definition: {
                        id: string;
                        name: string;
                        rarity: string;
                        type: string;
                        target: string;
                        cost: string | number;
                        effects: {
                            kind: string;
                            amount: string | number;
                            target: string;
                            power: string | null;
                            upgradeAmount: string | number;
                            condition: string;
                            repeat: string | number;
                        }[];
                        keywords: string[];
                        theme: string;
                        rationale: string;
                        artPrompt: string;
                        quality: number;
                    };
                    lucky: boolean;
                };
                "application/x-www-form-urlencoded": {
                    runId: string;
                    instanceId: string;
                    definition: {
                        id: string;
                        name: string;
                        rarity: string;
                        type: string;
                        target: string;
                        cost: string | number;
                        effects: {
                            kind: string;
                            amount: string | number;
                            target: string;
                            power: string | null;
                            upgradeAmount: string | number;
                            condition: string;
                            repeat: string | number;
                        }[];
                        keywords: string[];
                        theme: string;
                        rationale: string;
                        artPrompt: string;
                        quality: number;
                    };
                    lucky: boolean;
                };
                "multipart/form-data": {
                    runId: string;
                    instanceId: string;
                    definition: {
                        id: string;
                        name: string;
                        rarity: string;
                        type: string;
                        target: string;
                        cost: string | number;
                        effects: {
                            kind: string;
                            amount: string | number;
                            target: string;
                            power: string | null;
                            upgradeAmount: string | number;
                            condition: string;
                            repeat: string | number;
                        }[];
                        keywords: string[];
                        theme: string;
                        rationale: string;
                        artPrompt: string;
                        quality: number;
                    };
                    lucky: boolean;
                };
            };
        };
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id: string;
                        kind: string;
                        status: string;
                        error: string | null;
                        createdAt: string;
                        completedAt: string | null;
                    };
                };
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
        requestBody: {
            content: {
                "application/json": {
                    runId: string;
                    instanceId: string;
                    definitionId: string;
                    requestId: string;
                };
                "application/x-www-form-urlencoded": {
                    runId: string;
                    instanceId: string;
                    definitionId: string;
                    requestId: string;
                };
                "multipart/form-data": {
                    runId: string;
                    instanceId: string;
                    definitionId: string;
                    requestId: string;
                };
            };
        };
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id: string;
                        kind: string;
                        status: string;
                        error: string | null;
                        createdAt: string;
                        completedAt: string | null;
                    };
                };
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
        requestBody: {
            content: {
                "application/json": {
                    definitionId: string;
                    pngBase64: string;
                };
                "application/x-www-form-urlencoded": {
                    definitionId: string;
                    pngBase64: string;
                };
                "multipart/form-data": {
                    definitionId: string;
                    pngBase64: string;
                };
            };
        };
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id: string;
                        kind: string;
                        status: string;
                        error: string | null;
                        createdAt: string;
                        completedAt: string | null;
                    };
                };
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
        requestBody: {
            content: {
                "application/json": {
                    mode: string;
                    drawChance: number;
                    maxPerTurn: string | number;
                    cooldownTurns: string | number;
                    strength: number;
                    synergy: number;
                    enabled: boolean;
                    debugConsole: boolean;
                };
                "application/x-www-form-urlencoded": {
                    mode: string;
                    drawChance: number;
                    maxPerTurn: string | number;
                    cooldownTurns: string | number;
                    strength: number;
                    synergy: number;
                    enabled: boolean;
                    debugConsole: boolean;
                };
                "multipart/form-data": {
                    mode: string;
                    drawChance: number;
                    maxPerTurn: string | number;
                    cooldownTurns: string | number;
                    strength: number;
                    synergy: number;
                    enabled: boolean;
                    debugConsole: boolean;
                };
            };
        };
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        mode: string;
                        drawChance: number;
                        maxPerTurn: string | number;
                        cooldownTurns: string | number;
                        strength: number;
                        synergy: number;
                        enabled: boolean;
                        debugConsole: boolean;
                    };
                };
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
        requestBody: {
            content: {
                "application/json": {
                    instanceId: string;
                    protected: boolean;
                };
                "application/x-www-form-urlencoded": {
                    instanceId: string;
                    protected: boolean;
                };
                "multipart/form-data": {
                    instanceId: string;
                    protected: boolean;
                };
            };
        };
        responses: {
            /** @description Response for status 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id: string;
                        modelId: string;
                        definitionId: string | null;
                        name: string;
                        rarity: string;
                        type: string;
                        cost: string | number;
                        upgradeLevel: string | number;
                        pile: string;
                        description: string;
                        wildcard: boolean;
                        resolved: boolean;
                        protected: boolean;
                        lastTransformedTurn: string | number;
                    };
                };
            };
        };
    };
}
