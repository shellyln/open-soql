// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { QueryBuilderInfo }   from './types';
import { prepareQuery,
         prepareBuilderInfo } from './lib/prepare';
import { executeQuery }       from './lib/run-query';



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
        insert: (resolver: string, obj: object | object[]) => void 0,
        // eslint-disable-next-line @typescript-eslint/ban-types
        update: (resolver: string, obj: object | object[]) => void 0,
        // eslint-disable-next-line @typescript-eslint/ban-types
        remove: (resolver: string, obj: object | object[]) => void 0,
    });
}
