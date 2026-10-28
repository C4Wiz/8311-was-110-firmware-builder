'use strict';
'require baseclass';

// Same bar as the Memory panel: exact percentages, and fills that start as a round dot and
// add their share of the remaining track so small values stay rounded and proportional.
function progressbar(used, total) {
	var pc = total > 0 ? Math.min(100, Math.max(0, used * 100 / total)) : 0;

	return E('div', {
		'class': 'cbi-progressbar',
		'title': '%s / %s (%.2f%%)'.format(String.format('%1024.2mB', used), String.format('%1024.2mB', total), pc)
	}, E('div', {
		'style': pc > 0 ? 'width:calc(1rem + (100%% - 1rem) * %.4f)'.format(pc / 100) : 'width:0'
	}));
}

var labels = {
	'/overlay': _('Settings & packages (/overlay)'),
	'/ptconf': _('PON configuration (/ptconf)'),
	'/tmp': _('Temporary, in RAM (/tmp)')
};

return baseclass.extend({
	title: _('Storage'),

	load: function () {
		if (document.hidden)
			return Promise.resolve(this.lastStatus || {});
		if (this.pendingStatus)
			return this.pendingStatus;

		var self = this;
		this.pendingStatus = L.Request.get(L.url('admin/8311/storage_status')).then(function (res) {
			return res.json();
		}).then(function (data) {
			self.pendingStatus = null;
			self.lastStatus = data;
			return data;
		}, function (error) {
			self.pendingStatus = null;
			throw error;
		});
		return this.pendingStatus;
	},

	render: function (data) {
		var filesystems = (data && data.filesystems) || [],
		    table = E('div', { 'class': 'table' });

		filesystems.forEach(function (fs) {
			table.appendChild(E('div', { 'class': 'tr' }, [
				E('div', { 'class': 'td left', 'width': '33%' }, [labels[fs.mount] || fs.mount]),
				E('div', { 'class': 'td left' }, [progressbar(fs.used, fs.total)])
			]));
		});

		if (!filesystems.length)
			table.appendChild(E('div', { 'class': 'tr' }, [
				E('div', { 'class': 'td left', 'width': '33%' }, [_('Storage')]),
				E('div', { 'class': 'td left' }, ['?'])
			]));

		return table;
	}
});
