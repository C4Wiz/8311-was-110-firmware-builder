'use strict';
// Stock LuCI 19.07 system panel (Apache-2.0), minus Local Time (the stick has no NTP by default),
// and with the build revision (e.g. v19.07.8_maxlinear) added to Firmware Version.
'require baseclass';
'require fs';
'require rpc';

var callSystemBoard = rpc.declare({
	object: 'system',
	method: 'board'
});

var callSystemInfo = rpc.declare({
	object: 'system',
	method: 'info'
});

return baseclass.extend({
	title: _('System'),

	load: function() {
		return Promise.all([
			L.resolveDefault(callSystemBoard(), {}),
			L.resolveDefault(callSystemInfo(), {}),
			fs.lines('/usr/lib/lua/luci/version.lua')
		]);
	},

	render: function(data) {
		var boardinfo   = data[0],
		    systeminfo  = data[1],
		    luciversion = data[2];

		luciversion = luciversion.filter(function(l) {
			return l.match(/^\s*(luciname|luciversion)\s*=/);
		}).map(function(l) {
			return l.replace(/^\s*\w+\s*=\s*['"]([^'"]+)['"].*$/, '$1');
		}).join(' ');

		var fields = [
			_('Hostname'),         boardinfo.hostname,
			_('Model'),            boardinfo.model,
			_('Architecture'),     boardinfo.system,
			_('Firmware Version'), (L.isObject(boardinfo.release) ? boardinfo.release.description +
				(boardinfo.release.revision ? ' (%s)'.format(boardinfo.release.revision) : '') + ' / ' : '') + (luciversion || ''),
			_('Kernel Version'),   boardinfo.kernel,
			_('Uptime'),           systeminfo.uptime ? '%t'.format(systeminfo.uptime) : null,
			_('CPU Load (1, 5, 15 min)'), Array.isArray(systeminfo.load) ? '%.2f, %.2f, %.2f'.format(
				systeminfo.load[0] / 65535.0,
				systeminfo.load[1] / 65535.0,
				systeminfo.load[2] / 65535.0
			) : null
		];

		var table = E('div', { 'class': 'table' });

		for (var i = 0; i < fields.length; i += 2) {
			table.appendChild(E('div', { 'class': 'tr' }, [
				E('div', { 'class': 'td left', 'width': '33%' }, [ fields[i] ]),
				E('div', { 'class': 'td left' }, [ (fields[i + 1] != null) ? fields[i + 1] : '?' ])
			]));
		}

		return table;
	}
});
