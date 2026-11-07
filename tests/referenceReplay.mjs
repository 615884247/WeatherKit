import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Run the edited source against dependencies embedded in the author's beta.
// This is an isolated source replay, not an npm build or a live Apple test.
const project = new URL('../', import.meta.url);
assert.ok(process.argv[2], 'Usage: node tests/referenceReplay.mjs /path/to/pinned-gist');
const reference = pathToFileURL(resolve(process.argv[2]) + '/');
const expected = {
    "request": "db0db4a6bf757f190a32d2c54b770542ef980ec86cd228acae5823275b827b30",
    "response": "64856ed8630c6220fafd176f175679503bc1253aea28af2dc3c29973aac94e42"
};
const fixture = new Uint8Array(readFileSync(new URL('tests/fixtures/wk3-aq.synthetic.bin', project)));
const replacement = {
    metadata: { providerName: 'ReplayProvider', sourceType: 'MODELED', reportedTime: 2000000000, temporarilyUnavailable: false },
    scale: 'EPA_NowCast', index: 175, categoryIndex: 4, isSignificant: true, primaryPollutant: 'PM2_5',
    pollutants: [{ pollutantType: 'PM2_5', amount: 50, units: 'MICROGRAMS_PER_CUBIC_METER' }], previousDayComparison: 'UNKNOWN',
};

function load(kind) {
    const referenceText = readFileSync(new URL(`${kind}.dev.bundle.js`, reference), 'utf8');
    assert.equal(createHash('sha256').update(referenceText).digest('hex'), expected[kind], 'Reference must match the reviewed Gist snapshot');
    const handler = kind === 'response' ? 'Response' : 'Request';
    const prefix = referenceText.slice(0, referenceText.indexOf(`async function ${handler}(`));
    assert.ok(prefix.length > 1000);
    const source = readFileSync(new URL(`src/process/${handler}.mjs`, project), 'utf8')
        .replace(/^import .*;\n/gm, '').replace('export async function', 'async function');
    const context = vm.createContext({
        console: { log() {}, error() {}, warn() {}, debug() {}, info() {} }, URL, URLSearchParams,
        TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, DataView, structuredClone, setTimeout, clearTimeout,
        $environment: { 'surge-version': 'replay' },
        $persistentStore: { read: () => null, write: () => true },
        $script: { startTime: Date.now() / 1000 },
        $httpClient: { get: () => assert.fail('Live HTTP must never be used in replay') },
    });
    const exports = kind === 'response'
        ? '{ Response, WeatherKit3, ColorfulClouds, QWeather, ByteBuffer, Builder, WK2: bt, WK3: pt }'
        : '{ Request, Storage }';
    const bridge = kind === 'response' ? 'const flatbuffers = { ByteBuffer };' : '';
    vm.runInContext(`${prefix}\n${bridge}\n${source}\nglobalThis.subject = ${exports};`, context);
    return { context, ...context.subject };
}

const subject = load('response');
function settings(dataSets = ['airQuality', 'currentWeather', 'forecastNextHour', 'weatherAlerts']) {
    subject.context.$argument = {
        LogLevel: 'OFF', Storage: 'Argument', DataSets: dataSets.length ? dataSets : '[]',
        AirQuality: {
            Current: { Index: { Provider: 'ColorfulCloudsUS', Replace: ['EPA_NowCast'] }, Pollutants: { Provider: 'ColorfulClouds', Units: { Replace: [] } } },
            Comparison: { ReplaceWhenCurrentChange: true, Yesterday: { IndexProvider: 'ColorfulCloudsUS' } },
        },
    };
}
let calls = 0;
subject.ColorfulClouds.prototype.CurrentAirQuality = async () => { calls++; return structuredClone(replacement); };
subject.ColorfulClouds.prototype.YesterdayAirQuality = async () => ({ ...structuredClone(replacement), index: 25, categoryIndex: 1 });
subject.ColorfulClouds.prototype.Minutely = async () => assert.fail('Malformed existing next-hour data must be preserved');
subject.QWeather.prototype.WeatherAlertWeb = async () => assert.fail('Malformed existing alerts must be preserved');
function child(bytes, slot) {
    const bb = new subject.ByteBuffer(bytes), root = bb.readUint32(0), field = bb.__offset(root, 4 + 2 * slot);
    return field ? bb.__indirect(root + field) : 0;
}
async function response(bytes = fixture.slice(), dataSets = 'airQuality,currentWeather,forecastNextHour,weatherAlerts') {
    return subject.Response({ method: 'GET', headers: {}, url: `https://weatherkit.apple.com/api/v3/weather/en-US/31.25/121.5?country=CN&dataSets=${dataSets}` },
        { status: 200, headers: { 'Content-Type': 'application/vnd.apple.flatbuffer' }, bodyBytes: bytes });
}

settings();
const replaced = (await response()).body;
assert.equal(subject.WK3.Weather.getRootAsWeather(new subject.ByteBuffer(replaced)).airQuality().index(), 175);
const shift = child(replaced, 1) - child(fixture, 1);
for (const slot of [1, 5, 9]) assert.equal(child(replaced, slot), child(fixture, slot) + shift);
console.log('PASS stable WK3 AQ replacement; unrelated root products retained');

const bad = fixture.slice(), bb = new subject.ByteBuffer(bad), aq = subject.WK3.Weather.getRootAsWeather(bb).airQuality();
const vtable = aq.bb_pos - bb.readInt32(aq.bb_pos);
new DataView(bad.buffer).setUint16(vtable, bb.readUint16(vtable) + 2, true);
calls = 0;
assert.deepEqual((await response(bad)).body, bad);
assert.equal(calls, 0);
console.log('PASS malformed WK3 AQ remains byte-identical without provider calls');

for (const [configured, requested] of [[[], 'airQuality'], [['airQuality'], 'currentWeather']]) {
    settings(configured); calls = 0;
    assert.deepEqual((await response(fixture.slice(), requested)).body, fixture);
    assert.equal(calls, 0);
}
console.log('PASS configured/requested dataset intersection and disabled datasets');

settings([]);
const builder = new subject.Builder();
subject.WK2.Weather.startWeather(builder); builder.finish(subject.WK2.Weather.endWeather(builder));
const empty = builder.asUint8Array();
const wk2 = await subject.Response({ method: 'GET', headers: {}, url: 'https://weatherkit.apple.com/api/v2/weather/en-US/1/2?dataSets=currentWeather' },
    { status: 200, headers: { 'Content-Type': 'application/vnd.apple.flatbuffer' }, bodyBytes: empty });
assert.deepEqual(wk2.body, empty);
console.log('PASS stable WK2 traffic remains byte-identical with datasets disabled');

const request = load('request');
request.context.$argument = { LogLevel: 'OFF', Storage: 'Argument' };
const getItem = request.Storage.getItem;
request.Storage.getItem = function(key, ...args) { return key === '@iRingo.Location.Caches' ? { pep: { gcc: 'CN' } } : getItem.call(this, key, ...args); };
for (const version of ['v2', 'v3']) {
    const result = await request.Request({ method: 'GET', headers: { 'User-Agent': 'WeatherKit_Weather_macOS_Version 27' },
        url: `https://weatherkit.apple.com/api/${version}/weather/en-US/1/2?dataSets=airQuality,futureProduct` });
    const url = new URL(result.$request.url);
    assert.equal(url.searchParams.get('country'), 'CN');
    assert.equal(url.searchParams.get('dataSets'), 'airQuality,futureProduct');
}
console.log('PASS macOS country repair and unknown dataset retention for WK2/WK3');
