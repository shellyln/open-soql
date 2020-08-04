// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { QueryBuilderInfo }   from './types';
import { prepareQuery,
         prepareBuilderInfo } from './lib/prepare';
import { executeQuery }       from './lib/run-query';
import { executeInsertDML,
         executeUpdateDML,
         executeRemoveDML }   from './lib/run-dml';



// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function build(builder: QueryBuilderInfo) {
    const preparedBI = prepareBuilderInfo(builder);

    async function runQuery<R>(strings: TemplateStringsArray | string, ...values: any[]): Promise<R[]> {
        const query = prepareQuery(preparedBI, strings, ...values);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return await executeQuery(preparedBI, query, null, null, null, null);
    }

    async function runInsert<T>(resolver: string, obj: T): Promise<T extends (infer R)[] ? R[] : T> {
        const isArray = Array.isArray(obj);
        const ret = await executeInsertDML(preparedBI, resolver, isArray ? obj as any : [obj]);
        if (isArray) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return ret as any;
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return ret[0];
        }
    }

    async function runUpdate<T>(resolver: string, obj: T): Promise<T extends (infer R)[] ? R[] : T> {
        const isArray = Array.isArray(obj);
        const ret = await executeUpdateDML(preparedBI, resolver, isArray ? obj as any : [obj]);
        if (isArray) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return ret as any;
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return ret[0];
        }
    }

    async function runRemove<T>(resolver: string, obj: T) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return await executeRemoveDML(preparedBI, resolver, Array.isArray(obj) ? obj : [obj]);
    }

    return ({
        soql: runQuery,
        insert: runInsert,
        update: runUpdate,
        remove: runRemove,
    });
}
