const { resolve } = require('path');

module.exports = [
    {
        entry: './src/index.ts',
        mode: 'production',
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: [
                        {
                            loader: 'ts-loader',
                            options: {
                                configFile: 'tsconfig.prod.json',
                            },
                        },
                    ],
                    exclude: /node_modules/,
                },
            ],
        },
        resolve: {
            extensions: ['.ts', '.js'],
        },
        output: {
            libraryTarget: 'umd',
            globalObject: 'this',
            library: 'providerKeeper',
            filename: 'provider-keeper.js',
            path: resolve(__dirname, 'dist'),
        },
    },
];
