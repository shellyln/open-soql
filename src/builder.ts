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

    function createTransactionScope(scopeTr: any, isIsolated: boolean) {

        async function withTransactionEvents<R>(tr: any, run: (tx: any) => Promise<R>) {
            try {
                // TODO: fire event

                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const ret =  await run(tr);

                // TODO: fire event

                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return ret;
            } catch (e) {
                // TODO: fire event
                throw e;
            }
        }

        async function runQuery<R>(strings: TemplateStringsArray | string, ...values: any[]): Promise<R[]> {
            const run = async (tr: any) => {
                const query = prepareQuery(preparedBI, strings, ...values);
                const ret = await executeQuery(preparedBI, tr, query, null, null, null, null);

                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return ret;
            };

            if (isIsolated) {
                return await withTransactionEvents<R[]>({}, run);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return await run(scopeTr);
            }
        }

        async function runInsert<T>(resolver: string, obj: T): Promise<T extends (infer R)[] ? R[] : T> {
            const run = async (tr: any) => {
                const isArray = Array.isArray(obj);
    
                const ret = await executeInsertDML(preparedBI, tr, resolver, isArray ? obj as any : [obj]);
                if (isArray) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    return ret as any;
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    return ret[0];
                }
            };

            if (isIsolated) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return await withTransactionEvents({}, run);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return await run(scopeTr);
            }
        }

        async function runUpdate<T>(resolver: string, obj: T): Promise<T extends (infer R)[] ? R[] : T> {
            const run = async (tr: any) => {
                const isArray = Array.isArray(obj);
    
                const ret = await executeUpdateDML(preparedBI, tr, resolver, isArray ? obj as any : [obj]);
                if (isArray) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    return ret as any;
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    return ret[0];
                }
            };

            if (isIsolated) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return await withTransactionEvents({}, run);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return await run(scopeTr);
            }
        }

        async function runRemove<T>(resolver: string, obj: T) {
            const run = async (tr: any) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return await executeRemoveDML(preparedBI, tr, resolver, Array.isArray(obj) ? obj : [obj]);
            };

            if (isIsolated) {
                return await withTransactionEvents({}, run);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return await run(scopeTr);
            }
        }

        async function transaction(
                callback: (params: {
                    soql: typeof runQuery,
                    insert: typeof runInsert,
                    update: typeof runUpdate,
                    remove: typeof runRemove,
                }) => Promise<void>) {

            const tx = {};
            const commands = createTransactionScope(tx, false);

            const run = async (tr: any) => {
                await callback({
                    soql: commands.soql,
                    insert: commands.insert,
                    update: commands.update,
                    remove: commands.remove,
                });
            };

            return await withTransactionEvents(tx, run);
        }

        return ({
            soql: runQuery,
            insert: runInsert,
            update: runUpdate,
            remove: runRemove,
            transaction,
        });
    }

    return createTransactionScope({}, true);
}
