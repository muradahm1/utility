import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

describe('Firebase Backend Client & Persistence Adapter', () => {
    let sandbox;

    beforeEach(() => {
        sandbox = {
            window: {},
            console: { log: () => {}, warn: () => {}, error: () => {}, info: () => {} },
            APP_CONFIG: {
                FIREBASE: {
                    apiKey: "AIzaSyDjFGku4UvEDBzgi8WNNX46Xgo8u6UF1zk",
                    authDomain: "getcalcu-98dc0.firebaseapp.com",
                    projectId: "getcalcu-98dc0",
                    storageBucket: "getcalcu-98dc0.firebasestorage.app",
                    messagingSenderId: "672912367081",
                    appId: "1:672912367081:web:e525a126ce57c1129abf78",
                    measurementId: "G-9R2C0BJHV3"
                }
            },
            firebase: undefined,
            Date,
            JSON,
            Promise,
            setTimeout,
            clearTimeout,
            URLSearchParams: globalThis.URLSearchParams
        };
        sandbox.window = sandbox;
    });

    it('defines all required backend interface contract functions on window', () => {
        const code = readFileSync(resolve(process.cwd(), 'js/firebase.js'), 'utf-8');
        vm.createContext(sandbox);
        vm.runInContext(code, sandbox);

        const requiredFunctions = [
            'getSession',
            'getUser',
            'onAuthChange',
            'signUp',
            'signIn',
            'signInWithGoogle',
            'resetPassword',
            'updatePassword',
            'signOut',
            'saveCalculation',
            'getHistory',
            'deleteCalculation',
            'clearAllHistory',
            'getProfile',
            'updateProfile',
            'formatDate'
        ];

        requiredFunctions.forEach(fnName => {
            expect(typeof sandbox[fnName], `Function ${fnName} should be defined on window`).toBe('function');
        });
    });

    it('provides backward-compatible _sb shim for legacy auth listeners', () => {
        const code = readFileSync(resolve(process.cwd(), 'js/firebase.js'), 'utf-8');
        vm.createContext(sandbox);
        vm.runInContext(code, sandbox);

        expect(sandbox._sb).toBeDefined();
        expect(sandbox._sb.auth).toBeDefined();
        expect(typeof sandbox._sb.auth.onAuthStateChange).toBe('function');
        expect(typeof sandbox._sb.auth.getSession).toBe('function');
        expect(typeof sandbox._sb.auth.getUser).toBe('function');
        expect(typeof sandbox._sb.auth.signUp).toBe('function');
        expect(typeof sandbox._sb.auth.signInWithPassword).toBe('function');
    });

    it('gracefully saves to local fallback when offline or database is not available', async () => {
        sandbox.localStorage = {
            _store: {},
            getItem(key) { return this._store[key] || null; },
            setItem(key, val) { this._store[key] = String(val); },
            removeItem(key) { delete this._store[key]; }
        };
        const code = readFileSync(resolve(process.cwd(), 'js/firebase.js'), 'utf-8');
        vm.createContext(sandbox);
        vm.runInContext(code, sandbox);

        const result = await sandbox.saveCalculation('mortgage-calculator', 'Mortgage Calculator', { price: 300000 }, { payment: 1800 });
        expect(result.data).toBeDefined();
        expect(result.data.id).toContain('loc_');
        expect(result.error).toBeNull();
    });

    it('formats ISO timestamps to human-readable strings correctly', () => {
        const code = readFileSync(resolve(process.cwd(), 'js/firebase.js'), 'utf-8');
        vm.createContext(sandbox);
        vm.runInContext(code, sandbox);

        const formatted = sandbox.formatDate('2026-10-13T10:00:00Z');
        expect(formatted).toContain('2026');
        expect(formatted).toContain('Oct');
    });
});
