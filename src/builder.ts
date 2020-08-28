// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { QueryBuilderInfo,
         QueryParams,
         IQuery,
         PreparedQuery,
         SubscriberParams,
         Subscriber }      from './types';
import { prepareQuery,
         prepareBuilderInfo }   from './lib/prepare';
import { executeCompiledQuery } from './lib/run-query';
import { executeInsertDML,
         executeUpdateDML,
         executeRemoveDML }     from './lib/run-dml';



class Query implements IQuery {
    constructor(private query: PreparedQuery, private runCompiledQuery:
            (q: PreparedQuery, p?: QueryParams) => Promise<any[]>) {
        // nothing to do.
    }

    public execute<R>(params?: QueryParams): Promise<R[]> {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this.runCompiledQuery(this.query, params);
    }
}


interface Subscribers {
    [resolverNames: string]: Map<any, Set<Subscriber>>;
}

interface PublishedEvtQueueItem extends SubscriberParams {
    fn: Subscriber;
}

type PublishFn = (resolver: string, on: string, data: any[]) => void;


// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function build(builder: QueryBuilderInfo) {
    const preparedBI = prepareBuilderInfo(builder);
    const subscribers: Subscribers = {};


    class Publisher {
        private eventQueue: PublishedEvtQueueItem[] = [];

        public publish(resolver: string, on: string, data: any[]) {
            const map = subscribers[resolver];
            if (map && map.size) {
                {
                    const set = map.get(null);
                    if (set) {
                        for (const fn of set.values()) {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            this.eventQueue.push({ on, resolver, id: null, fn });
                        }
                    }
                }
                const idFieldName = preparedBI.rules.idFieldName(resolver);
                for (const rec of data) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                    const id = rec[idFieldName];
                    const set = map.get(id);
                    if (set) {
                        for (const fn of set.values()) {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            this.eventQueue.push({ on, resolver, id, fn });
                        }
                    }
                }
            }
        }

        public toPublishFn() {
            return (resolver: string, on: string, data: any[]) => this.publish(resolver, on, data);
        }

        public fire() {
            if (this.eventQueue.length) {
                const queue = this.eventQueue;
                this.eventQueue = [];

                setTimeout(() => {
                    for (const q of queue) {
                        try {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            q.fn({ on: q.on, resolver: q.resolver, id: q.id });
                        } catch (e) {
                            // nothing to do.
                        }
                    }
                }, 0);
            }
        }
    }


    function subscribe(resolver: string, id: any | null, fn: Subscriber) {
        if (! subscribers[resolver]) {
            subscribers[resolver] = new Map<any, Set<Subscriber>>();
        }

        const map = subscribers[resolver];
        if (! map.has(id)) {
            map.set(id, new Set<Subscriber>());
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const set = map.get(id)!;
        set.add(fn);
    }


    function unsubscribe(resolver: string, id: any | null, fn: Subscriber) {
        if (! subscribers[resolver]) {
            return;
        }

        const map = subscribers[resolver];
        if (! map.has(id)) {
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const set = map.get(id)!;
        set.delete(fn);
    }


    function createTransactionScope(
            scopeTr: any, scopeTrOptions: any | undefined, scopePublisher: Publisher | undefined, isIsolated: boolean) {

        const scopePub = scopePublisher?.toPublishFn();


        async function withTransactionEvents<R>(
                tr: any, trOptions: any | undefined, publisher: Publisher,
                run: (tx: any, txOpts: any | undefined, publish: PublishFn) => Promise<R>) {

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
                const ret =  await run(tr, trOptions, publisher.toPublishFn());

                if (preparedBI.events.endTransaction) {
                    await preparedBI.events.endTransaction({
                        resolverData: {},
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        transactionData: tr,
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        transactionOptions: trOptions,
                    }, null);
                }

                publisher.fire();

                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return ret;
            } catch (e) {
                try {
                    if (preparedBI.events.endTransaction) {
                        await preparedBI.events.endTransaction({
                            resolverData: {},
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            transactionData: tr,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            transactionOptions: trOptions,
                        }, e);
                    }
                } catch (e2) {
                    // nothing to do.
                }
                throw e;
            }
        }


        async function runCompiledQuery<R>(query: PreparedQuery, params?: QueryParams): Promise<R[]> {
            const run = async (tr: any, trOptions: any | undefined, publish: PublishFn) => {
                const ret = await executeCompiledQuery(preparedBI, params ?? {}, tr, trOptions, query, null, null, null, null);

                if (query.for && (query.for.includes('view') || query.for.includes('reference'))) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    publish(query.from[0].resolverName![query.from[0].resolverName!.length - 1], 'update', ret);
                }

                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return ret;
            };

            if (isIsolated) {
                return await withTransactionEvents<R[]>({}, void 0, new Publisher(), run);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-non-null-assertion
                return await run(scopeTr, scopeTrOptions, scopePub!);
            }
        }


        function compileQuery(strings: TemplateStringsArray | string, ...values: any[]): IQuery {
            const query = prepareQuery(preparedBI, strings, ...values);
            return new Query(query, runCompiledQuery);
        }


        async function runQuery<R>(strings: TemplateStringsArray | string, ...values: any[]): Promise<R[]> {
            const run = async (tr: any, trOptions: any | undefined, publish: PublishFn) => {
                const query = prepareQuery(preparedBI, strings, ...values);
                const ret = await executeCompiledQuery(preparedBI, {}, tr, trOptions, query, null, null, null, null);

                if (query.for && (query.for.includes('view') || query.for.includes('reference'))) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    publish(query.from[0].resolverName![query.from[0].resolverName!.length - 1], 'update', ret);
                }

                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return ret;
            };

            if (isIsolated) {
                return await withTransactionEvents<R[]>({}, void 0, new Publisher(), run);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-non-null-assertion
                return await run(scopeTr, scopeTrOptions, scopePub!);
            }
        }


        async function runInsert<T>(resolver: string, obj: T): Promise<T extends (infer R)[] ? R[] : T> {
            const run = async (tr: any, trOptions: any | undefined, publish: PublishFn) => {
                const isArray = Array.isArray(obj);
    
                const ret = await executeInsertDML(preparedBI, tr, trOptions, resolver, isArray ? obj as any : [obj]);

                publish(resolver, 'insert', ret);

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
                return await withTransactionEvents({}, void 0, new Publisher(), run);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-non-null-assertion
                return await run(scopeTr, scopeTrOptions, scopePub!);
            }
        }


        async function runUpdate<T>(resolver: string, obj: T): Promise<T extends (infer R)[] ? R[] : T> {
            const run = async (tr: any, trOptions: any | undefined, publish: PublishFn) => {
                const isArray = Array.isArray(obj);

                const ret = await executeUpdateDML(preparedBI, tr, trOptions, resolver, isArray ? obj as any : [obj]);

                publish(resolver, 'update', ret);

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
                return await withTransactionEvents({}, void 0, new Publisher(), run);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-non-null-assertion
                return await run(scopeTr, scopeTrOptions, scopePub!);
            }
        }


        async function runRemove<T>(resolver: string, obj: T): Promise<void> {
            const run = async (tr: any, trOptions: any | undefined, publish: PublishFn) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const data: any[] = Array.isArray(obj) ? obj : [obj];

                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                await executeRemoveDML(preparedBI, tr, trOptions, resolver, data);

                publish(resolver, 'remove', data);

                return;
            };

            if (isIsolated) {
                return await withTransactionEvents({}, void 0, new Publisher(), run);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-non-null-assertion
                return await run(scopeTr, scopeTrOptions, scopePub!);
            }
        }


        async function runTouch<T>(resolver: string, obj: T): Promise<void> {
            const run = (tr: any, trOptions: any | undefined, publish: PublishFn) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const data: any[] = Array.isArray(obj) ? obj : [obj];

                publish(resolver, 'update', data);

                return Promise.resolve();
            };

            if (isIsolated) {
                return await withTransactionEvents({}, void 0, new Publisher(), run);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-non-null-assertion
                return await run(scopeTr, scopeTrOptions, scopePub!);
            }
        }


        async function transaction(
                callback: (commands: {
                        compile: typeof compileQuery,
                        soql: typeof runQuery,
                        insert: typeof runInsert,
                        update: typeof runUpdate,
                        remove: typeof runRemove,
                        touch: typeof runTouch,
                    }, tr: any) => Promise<void>,
                trOptions?: any,
                ) {

            const tr = {};

            const publisher = new Publisher();
            const commands = createTransactionScope(tr, trOptions, publisher, false);

            const run = async (tr: any, trOptions: any | undefined, publish: PublishFn) => {
                await callback({
                    compile: commands.compile,
                    soql: commands.soql,
                    insert: commands.insert,
                    update: commands.update,
                    remove: commands.remove,
                    touch: commands.touch,
                }, tr);
            };

            return await withTransactionEvents(tr, trOptions, publisher, run);
        }

        return ({
            compile: compileQuery,
            soql: runQuery,
            insert: runInsert,
            update: runUpdate,
            remove: runRemove,
            touch: runTouch,
            subscribe,
            unsubscribe,
            transaction,
        });
    }


    return createTransactionScope({}, void 0, void 0, true);
}
