import { describe, expect, it } from 'vitest';
import { normalizeAppVersion } from '$lib/server/nextbus';

describe('normalizeAppVersion', () => {
	it('passes through the Android ESB form', () => {
		expect(normalizeAppVersion('univus_android_2.60.8_147')).toBe('univus_android_2.60.8_147');
	});

	it('prefixes bare semver with a high default build code', () => {
		expect(normalizeAppVersion('2.60.8')).toBe('univus_android_2.60.8_999');
	});

	it('prefixes name_code and attaches build when provided', () => {
		expect(normalizeAppVersion('2.60.8', '147')).toBe('univus_android_2.60.8_147');
		expect(normalizeAppVersion('2.60.8_147')).toBe('univus_android_2.60.8_147');
		expect(normalizeAppVersion('univus_android_2.60.8')).toBe('univus_android_2.60.8_999');
	});
});
