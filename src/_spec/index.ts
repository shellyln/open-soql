
function importAll(r: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    r.keys().forEach(r);
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
importAll((require as any).context('./', true, /\.spec\.(tsx|ts|jsx|js)$/));
