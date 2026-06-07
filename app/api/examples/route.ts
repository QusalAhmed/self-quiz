import { NextResponse } from 'next/server';

type CloudflareMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

// Native /AI/run endpoint response shape
type CloudflareAIResponse = {
    result?: {
        response?: string;
    };
    success?: boolean;
    errors?: Array<{ message: string }>;
};

type ExamplesPayload = {
    word?: string;
    meaning?: string;
};

// function extractJson(raw: string): string | null {
//     // Strip Markdown code fences if present
//     const text = raw
//         .replace(/^```[a-z]*\s*/i, '')
//         .replace(/\s*```$/i, '')
//         .trim();
//
//     // Try JSON object
//     const objStart = text.indexOf('{');
//     const objEnd = text.lastIndexOf('}');
//     if (objStart !== -1 && objEnd > objStart) {
//         return text.slice(objStart, objEnd + 1);
//     }
//
//     // Try bare JSON array → wrap into object
//     const arrStart = text.indexOf('[');
//     const arrEnd = text.lastIndexOf(']');
//     if (arrStart !== -1 && arrEnd > arrStart) {
//         return `{"examples":${text.slice(arrStart, arrEnd + 1)}}`;
//     }
//
//     return null;
// }
//
// function extractFromLines(text: string): string[] {
//     return text
//         .split(/\n+/)
//         .map((line) =>
//             line
//                 .replace(/^```[a-z]*/i, '')
//                 .replace(/```/g, '')
//                 .replace(/^[-*•]\s*/, '')
//                 .replace(/^\d+[.)]\s*/, '')
//                 .trim()
//         )
//         .filter((line) => line.length > 4 && !line.startsWith('{') && !line.startsWith('['));
// }
//
// function normalizeExamples(examples: string[]): string[] {
//     const cleaned = examples
//         .map((v) => v.replace(/^[-*\d.\s]+/, '').trim())
//         .filter((v) => v.length > 4);
//     return Array.from(new Set(cleaned)).slice(0, 5);
// }

export async function POST(request: Request) {
    let body: ExamplesPayload | null;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({error: 'Invalid request body'}, {status: 400});
    }

    const word = body?.word?.trim();
    const meaning = body?.meaning?.trim();
    if (!word || !meaning) {
        return NextResponse.json({error: 'Word and meaning are required'}, {status: 400});
    }

    const accountId = process.env.CF_ACCOUNT_ID;
    const apiToken = process.env.CF_API_TOKEN;
    if (!accountId || !apiToken) {
        return NextResponse.json(
            {error: 'Cloudflare AI credentials are not configured'},
            {status: 500}
        );
    }

    const model = process.env.CF_AI_MODEL ?? '@cf/moonshotai/kimi-k2.6';

    const messages: CloudflareMessage[] = [
        {
            role: 'system',
            content: 'You output only raw JSON. No markdown. No explanation. No code fences. Just a JSON object.',
        },
        {
            role: 'user',
            content:
                `Give me 5 example sentences in English using the word "${word}" (meaning: ${meaning}).\n` +
                'Reply with ONLY this JSON and nothing else:\n' +
                '{"examples":["sentence 1","sentence 2","sentence 3","sentence 4","sentence 5"]}',
        },
    ];

    try {
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

        const response = await fetch(
            url,
            {
                headers: { Authorization: `Bearer ${apiToken}` },
                method: "POST",
                body: JSON.stringify({messages}),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.warn('Cloudflare AI HTTP error:', response.status, errorText);
            return NextResponse.json({error: 'Failed to generate examples'}, {status: 502});
        }

        const data = (await response.json()) as CloudflareAIResponse;

        if (data.success === false && data.errors?.length) {
            const errMsg = data.errors.map((e) => e.message).join(', ');
            console.warn('Cloudflare AI returned errors:', errMsg);
            return NextResponse.json({error: 'AI service error: ' + errMsg}, {status: 502});
        }

        // Native endpoint returns the text directly in result.response
        const rawText = data?.result?.response ?? '';
        console.log('Raw AI response:', NextResponse.json(rawText));
        return NextResponse.json(rawText)

        // let examples: string[] = [];
        //
        // // 1. Try JSON extraction
        // const jsonText = extractJson(rawText);
        // if (jsonText) {
        //     try {
        //         const parsed = JSON.parse(jsonText) as { examples?: unknown };
        //         if (Array.isArray(parsed.examples) && parsed.examples.length > 0) {
        //             examples = (parsed.examples as unknown[]).filter(
        //                 (s): s is string => typeof s === 'string'
        //             );
        //         }
        //     } catch {
        //         // fall through to line-based extraction
        //     }
        // }
        //
        // // 2. Line-based fallback
        // if (examples.length === 0 && rawText) {
        //     examples = extractFromLines(rawText);
        // }
        //
        // const normalized = normalizeExamples(examples);
        //
        // if (normalized.length < 1) {
        //     console.warn('No usable examples. Raw text was:', JSON.stringify(rawText));
        //     return NextResponse.json({error: 'Insufficient examples returned'}, {status: 502});
        // }
        //
        // return NextResponse.json({examples: normalized});
    } catch (error) {
        console.error('Error in examples API:', error);
        return NextResponse.json(
            {error: error instanceof Error ? error.message : 'Internal server error'},
            {status: 500}
        );
    }
}