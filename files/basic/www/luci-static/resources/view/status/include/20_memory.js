'use strict';
// Stock LuCI 19.07 memory panel (Apache-2.0), with exact percentages instead of whole numbers rounded down,
// and fills that keep rounded ends for small values while staying proportional.
'require baseclass';
'require rpc';

var callSystemInfo = rpc.declare({
	object: 'system',
	method: 'info'
});

function progressbar(value, max, byte) {
	var vn = parseInt(value) || 0,
	    mn = parseInt(max) || 100,
	    fv = byte ? String.format('%1024.2mB', value) : value,
	    fm = byte ? String.format('%1024.2mB', max) : max,
	    pc = Math.min(100, Math.max(0, (100 / mn) * vn));

	return E('div', {
		'class': 'cbi-progressbar',
		'title': '%s / %s (%.2f%%)'.format(fv, fm, pc)
	}, E('div', {
		// Start from a round dot and add the true share of the remaining track, so small
		// values keep rounded ends, still grow in proportion, and 100% fills the bar exactly.
		'style': pc > 0 ? 'width:calc(1rem + (100%% - 1rem) * %.4f)'.format(pc / 100) : 'width:0'
	}));
}

return baseclass.extend({
	title: _('Memory'),

	load: function() {
		return L.resolveDefault(callSystemInfo(), {});
	},

	render: function(systeminfo) {
		var mem = L.isObject(systeminfo.memory) ? systeminfo.memory : {},
		    swap = L.isObject(systeminfo.swap) ? systeminfo.swap : {};

		var fields = [
			_('Total Available'), (mem.available) ? mem.available : (mem.total && mem.free && mem.buffered) ? mem.free + mem.buffered : null, mem.total,
			_('Used'),            (mem.total && mem.free) ? (mem.total - mem.free) : null, mem.total,
			_('Buffered'),        (mem.total && mem.buffered) ? mem.buffered : null, mem.total
		];

		if (mem.cached)
			fields.push(_('Cached'), mem.cached, mem.total);

		if (swap.total > 0)
			fields.push(_('Swap free'), swap.free, swap.total);

		var table = E('div', { 'class': 'table' });

		for (var i = 0; i < fields.length; i += 3) {
			table.appendChild(E('div', { 'class': 'tr' }, [
				E('div', { 'class': 'td left', 'width': '33%' }, [ fields[i] ]),
				E('div', { 'class': 'td left' }, [
					(fields[i + 1] != null) ? progressbar(fields[i + 1], fields[i + 2], true) : '?'
				])
			]));
		}

		return table;
	}
});
