// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { QueryBuilderInfo }     from './types';
import { prepareQuery,
         prepareBuilderInfo }   from './lib/prepare';
import { executeCompiledQuery } from './lib/run-query';
import { executeInsertDML,
         executeUpdateDML,
         executeRemoveDML }     from './lib/run-dml';



// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function build(builder: QueryBuilderInfo) {
    const preparedBI = prepareBuilderInfo(builder);

    function createTransactionScope(scopeTr: any, scopeTrOptions: any | undefined, isIsolated: boolean) {

        async function withTransactionEvents<R>(
                tr: any, trOptions: any | undefined, run: (tx: any, txOpts: any | undefined) => Promise<R>) {

            try {
                if (preparedBI.events.beginTransaction) {
                    await preparedBI.events.beginTransaction({
                        resolverData: {},
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        transactionData: tr,
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        transactionOptions: trOptions,
                    });
                }

                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const ret =  await run(tr, trOptions);

                if (preparedBI.events.endTransaction) {
                    await preparedBI.events.endTransaction({
                        resolverData: {},
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        transactionData: tr,
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        transactionOptions: trOptions,
                    }, null);
                }

                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return ret;
            } catch (e) {
                if (preparedBI.events.endTransaction) {
                    await preparedBI.events.endTransaction({
                        resolverData: {},
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        transactionData: tr,
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        transactionOptions: trOptions,
                    }, e);
                }
                throw e;
            }
        }

        async function runQuery<R>(strings: TemplateStringsArray | string, ...values: any[]): Promise<R[]> {
            const run = async (tr: any, trOptions: any | undefined) => {
                const query = prepareQuery(preparedBI, strings, ...values);
                const ret = await executeCompiledQuery(preparedBI, tr, trOptions, query, null, null, null, null);

                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return ret;
            };

            if (isIsolated) {
                return await withTransactionEvents<R[]>({}, void 0, run);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return await run(scopeTr, scopeTrOptions);
            }
        }

        async function runInsert<T>(resolver: string, obj: T): Promise<T extends (infer R)[] ? R[] : T> {
            const run = async (tr: any, trOptions: any | undefined) => {
                const isArray = Array.isArray(obj);
    
                const ret = await executeInsertDML(preparedBI, tr, trOptions, resolver, isArray ? obj as any : [obj]);
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
                return await withTransactionEvents({}, void 0, run);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return await run(scopeTr, scopeTrOptions);
            }
        }

        async function runUpdate<T>(resolver: string, obj: T): Promise<T extends (infer R)[] ? R[] : T> {
            const run = async (tr: any, trOptions: any | undefined) => {
                const isArray = Array.isArray(obj);
    
                const ret = await executeUpdateDML(preparedBI, tr, trOptions, resolver, isArray ? obj as any : [obj]);
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
                return await withTransactionEvents({}, void 0, run);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return await run(scopeTr, scopeTrOptions);
            }
        }

        async function runRemove<T>(resolver: string, obj: T) {
            const run = async (tr: any, trOptions: any | undefined) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return await executeRemoveDML(preparedBI, tr, trOptions, resolver, Array.isArray(obj) ? obj : [obj]);
            };

            if (isIsolated) {
                return await withTransactionEvents({}, void 0, run);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return await run(scopeTr, scopeTrOptions);
            }
        }

        async function transaction(
                callback: (commands: {
                        soql: typeof runQuery,
                        insert: typeof runInsert,
                        update: typeof runUpdate,
                        remove: typeof runRemove,
                    }, tr: any) => Promise<void>,
                trOptions?: any,
                ) {

            const tr = {};
            const commands = createTransactionScope(tr, trOptions, false);

            const run = async (_tr: any) => {
                await callback({
                    soql: commands.soql,
                    insert: commands.insert,
                    update: commands.update,
                    remove: commands.remove,
                }, tr);
            };

            return await withTransactionEvents(tr, trOptions, run);
        }

        return ({
            soql: runQuery,
            insert: runInsert,
            update: runUpdate,
            remove: runRemove,
            transaction,
        });
    }

    return createTransactionScope({}, void 0, true);
}
