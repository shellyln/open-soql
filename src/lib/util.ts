// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln



export const DatePattern = /^(\d{4}-[01]\d-[0-3]\d)$/;
export const DateTimePattern =
    /^((?:(?:\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+)|(?:\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d)|(?:\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d))(?:[+-][0-2]\d:[0-5]\d|Z))$/;
export const DateTimeNoTzPattern =
    /^((?:\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+)|(?:\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d)|(?:\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d))$/;


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
export function getFullQualifiedName(primaryResolverName: string[], name: string[]) {
    const ns: string[] = [];
    for (let i = 0; i < primaryResolverName.length; i++) {
        const sliced = primaryResolverName.slice(i);
        if (isEqualComplexName(name.slice(0, sliced.length), sliced)) {
            break;
        } else {
            ns.push(primaryResolverName[i]);
        }
    }
    if (ns.length) {
        return ns.concat(name);
    } else {
        return name;
    }
}


// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getTrueCaseFieldName(record: any, name: string) {
    const keys = Object.keys(record);
    const ni = name.toLowerCase();
    const index = keys.findIndex(x => x.toLowerCase() === ni);

    if (0 > index) {
        return null;
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
        return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return record[keys[index]];
}


// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getObjectValueWithFieldNameMap(map: Map<string, string>, record: any, name: string) {
    const ni = name.toLowerCase();

    if (! map.has(ni)) {
        return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion
    return record[map.get(ni)!];
}


// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getTrueCasePathName(record: any, name: string[]): string[] | null {
    const ret: string[] = [];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let r = record;

    for (const n of name) {
        if (r === null || r === void 0) {
            return null;
        }

        const keys = Object.keys(r);
        const ni = n.toLowerCase();
        const index = keys.findIndex(x => x.toLowerCase() === ni);

        if (0 > index) {
            return null;
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        r = r[keys[index]];

        ret.push(keys[index]);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return ret;
}


// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getObjectTrueCasePathValue(record: any, name: string[]) {

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let r = record;

    for (const n of name) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        r = r[n];

        if (r === null || r === void 0) {
            return null;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return r;
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
            return null;
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


export function convertPattern(v: string): string {
    // NOTE: wildcards are '%' (= /.*/) and '_' (= /./)
    //       wildcard escape sequences are '\%' and '\_'

    const pat0 = v.replace(/[.*+?^=!:${}()|[\]/]/g, '\\$&');
    let pattern = '';
    let prev: string | undefined = void 0;

    for (const c of pat0) {
        switch (c) {
        case '%':
            if (prev === '\\') {
                pattern += '%';
            } else {
                pattern += '.*';
            }
            break;
        case '_':
            if (prev === '\\') {
                pattern += '_';
            } else {
                pattern += '.';
            }
            break;
        case '\\':
            if (prev === '\\') {
                pattern += '\\\\';
                prev = void 0;
                continue;
            }
            break;
        default:
            if (prev === '\\') {
                pattern += '\\';
            }
            pattern += c;
        }
        prev = c;
    }
    if (prev === '\\') {
        pattern += '\\';
    }
    return `^${pattern}$`;
}
