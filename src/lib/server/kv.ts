import { env } from '$env/dynamic/private';
import { Redis } from '@upstash/redis';

let client: Redis | null | undefined;

/** Upstash / Vercel KV client. Null locally when Redis env vars are unset. */
export function kv(): Redis | null {
	if (client !== undefined) return client;
	const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
	const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
	if (env.VERCEL && (!url || !token)) {
		throw new Error(
			'KV_REST_API_URL and KV_REST_API_TOKEN are required on Vercel (see .env.example)'
		);
	}
	client = url && token ? new Redis({ url, token }) : null;
	return client;
}
