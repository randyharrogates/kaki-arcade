import { describe, expect, it } from 'vitest';
import { clientNetworks } from './address';
describe('DATA-005 canonical client networks', () => {
    it.each([
        ['192.0.2.1', ['192.0.2.1']],
        ['2001:0DB8:0000:0001:0000:0000:0000:0001', ['2001:db8:0:1::/64', '2001:db8:0::/48']],
        ['2001:db8:0:1::ffff', ['2001:db8:0:1::/64', '2001:db8:0::/48']],
        ['fe80::1%eth0', ['fe80:0:0:0::/64', 'fe80:0:0::/48']],
        ['::ffff:192.0.2.1', ['192.0.2.1']],
        ['0:0:0:0:0:FFFF:c000:201', ['192.0.2.1']],
        ['::1', ['0:0:0:0::/64', '0:0:0::/48']],
    ])('normalises %s', (input, expected) => { expect(clientNetworks(input)).toEqual(expected); });
    it.each([null, '', 'unknown', 'garbage', '192.0.2.256', '192.00.2.1', '1.2.3',
        '2001:db8:::1', '2001:db8::1::2', '2001:xyz::1', '[::1]', '::1/64', '1:2:3:4:5:6:7:8:9', '::1]/garbage#[', '192.0.2.1%eth0'])('refuses %s', (input) => {
        expect(clientNetworks(input)).toBeNull();
    });
});
