const path = require("path");
const { v4: uuidv4 } = require('uuid');

const devPort = 8081;

const appJson = {
    startup_app: {
      name: "WebRTC Performance Testing",
      description: "WebRTC Performance Testing",
      uuid: "WebRTC Performance Testing",
      autoShow: true,
      frame: true,
      defaultCentered: true,
      resizable: true,
      saveWindowState: false,
      defaultHeight: 630,
      defaultWidth: 500,
      backgroundThrottling: true,
    },
    runtime: {
      arguments: " --disable-features=CookiesWithoutSameSiteMustSecure,SameSiteByDefaultCookies ",
      version: "stable",
    },
  };

const { CleanWebpackPlugin } = require('clean-webpack-plugin');  
const HtmlwebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: './example.tsx',
    devtool: 'inline-source-map',
    stats: {
        logging: 'verbose',
    },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: 'bundle.[hash].js'
    },
    module: {
        rules: [
            {
                test: /\.(ts|tsx)?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            }            
        ]
    },
    resolve: {
        extensions: [ '.tsx', '.ts', '.js' ],
        alias: {
            'openfin-webrtc-client': path.resolve(__dirname, 'node_modules/openfin-webrtc-client')
        }
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlwebpackPlugin({
            title: 'WebRTC Performance Testing',
            template: 'index.html',
            filename: 'index.html'
        })
    ],
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        port: devPort,
        hotOnly: true,
        before: (app) => {
            app.get('/app.json', (req, res) => {
                let appUrl = `http://localhost:${devPort}/index.html`;
                const json = JSON.parse(JSON.stringify(appJson));
                json.startup_app.uuid = uuidv4();
                json.startup_app.url = appUrl;
                res.status(200).json(json);
            })
        }
    }
};