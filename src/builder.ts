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

    return ({
        soql: async (strings: TemplateStringsArray | string, ...values: any[]) => {
            const query = prepareQuery(preparedBI, strings, ...values);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return await executeQuery(preparedBI, query, null, null, null, null);
        },
        // eslint-disable-next-line @typescript-eslint/ban-types
        insert: async (resolver: string, obj: object | object[]) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return await executeInsertDML(preparedBI, resolver, Array.isArray(obj) ? obj : [obj]);
        },
        // eslint-disable-next-line @typescript-eslint/ban-types
        update: async (resolver: string, obj: object | object[]) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return await executeUpdateDML(preparedBI, resolver, Array.isArray(obj) ? obj : [obj]);
        },
        // eslint-disable-next-line @typescript-eslint/ban-types
        remove: async (resolver: string, obj: object | object[]) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return await executeRemoveDML(preparedBI, resolver, Array.isArray(obj) ? obj : [obj]);
        },
    });
}
