// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln



export function deepCloneObject<T>(obj: T): T {
    switch (typeof obj) {
    case 'object':
        if (Array.isArray(obj)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return obj.slice().map(x => deepCloneObject(x)) as any;
        } else if (obj === null) {
            return obj;
        } else {
            if (obj instanceof Map) {
                const ent: Array<[any, any]> =
                    Array.from(obj.entries())
                         .map(x => [deepCloneObject(x[0]), deepCloneObject(x[1])]);

                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return new Map(ent) as any;
            } else if (obj instanceof Set) {
                const ent =
                    Array.from(obj.values())
                         // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                         .map(x => deepCloneObject(x));

                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return new Set(ent) as any;
            } else {
                const r = {};
                for (const k of Object.keys(obj)) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    r[k] = deepCloneObject(obj[k]);
                }

                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return r as any;
            }
        }
    default:
        return obj;
    }
}


export function isEqualComplexName(a: string[], b: string[]): boolean {
    if (a.length !== b.length) {
        return false;
    }

    for (let i = 0; i < a.length; i++) {
        if (a[i].toLowerCase() !== b[i].toLowerCase()) {
            return false;
        }
    }

    return true;
}


// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getTrueCaseFieldName(record: any, name: string) {
    const keys = Object.keys(record);
    const ni = name.toLowerCase();
    const index = keys.findIndex(x => x.toLowerCase() === ni);

    if (0 > index) {
        return null;  // TODO: null or undefined?
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return keys[index];
}


// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getObjectValue(record: any, name: string) {
    const keys = Object.keys(record);
    const ni = name.toLowerCase();
    const index = keys.findIndex(x => x.toLowerCase() === ni);

    if (0 > index) {
        return null;  // TODO: null or undefined?
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return record[keys[index]];
}


// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getObjectPathValue(record: any, name: string[]) {

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let r = record;

    for (const n of name) {
        const keys = Object.keys(r);
        const ni = n.toLowerCase();
        const index = keys.findIndex(x => x.toLowerCase() === ni);

        if (0 > index) {
            return null;  // TODO: null or undefined?
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        r = r[keys[index]];

        if (r === null || r === void 0) {
            return null;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return r;
}
