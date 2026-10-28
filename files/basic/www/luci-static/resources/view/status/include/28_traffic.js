'use strict';
'require baseclass';

// Traffic from the PON chip's hardware counters for all GEM ports. On the fiber side the
// stick receives your downloads and transmits your uploads, so "down" is RX and "up" is TX.
function bits(rate) {
	var units = ['bps', 'Kbps', 'Mbps', 'Gbps'], i = 0;
	while (rate >= 1000 && i < units.length - 1) {
		rate /= 1000;
		i++;
	}
	return (i ? '%.2f %s' : '%.0f %s').format(rate, units[i]);
}

function bytes(value) {
	return value != null ? String.format('%1024.2mB', Number(value)) : '?';
}

function count(value) {
	return value != null ? String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '?';
}

function pair(down, up) {
	return '%s / %s'.format(down, up);
}

return baseclass.extend({
	title: _('Traffic'),

	load: function () {
		if (document.hidden)
			return Promise.resolve(this.lastStatus || {});
		if (this.pendingStatus)
			return this.pendingStatus;

		var self = this;
		this.pendingStatus = L.Request.get(L.url('admin/8311/traffic_status')).then(function (res) {
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

	// Turn two samples into bits per second, timed by the stick's uptime rather than the
	// browser's clock. A repeated sample (hidden tab) or a counter reset keeps the last rate.
	rates: function (data) {
		var sample = { uptime: Number(data.uptime), down: Number(data.rx_bytes), up: Number(data.tx_bytes) },
		    prev = this.prevSample;

		if (!isFinite(sample.uptime) || !isFinite(sample.down) || !isFinite(sample.up))
			return this.lastRates;

		if (prev && sample.uptime > prev.uptime) {
			var elapsed = sample.uptime - prev.uptime,
			    down = sample.down - prev.down,
			    up = sample.up - prev.up;

			this.lastRates = (down >= 0 && up >= 0) ? { down: down * 8 / elapsed, up: up * 8 / elapsed } : null;
		}

		if (!prev || sample.uptime !== prev.uptime)
			this.prevSample = sample;

		return this.lastRates;
	},

	render: function (data) {
		data = data || {};

		var rows;
		if (data.available === false) {
			rows = [_('Throughput (down / up)'), _('PON counters unavailable')];
		}
		else {
			var rates = this.rates(data);
			rows = [
				_('Throughput (down / up)'), rates ? pair(bits(rates.down), bits(rates.up)) : _('Measuring…'),
				_('Total since boot (down / up)'), pair(bytes(data.rx_bytes), bytes(data.tx_bytes)),
				_('Frames (down / up)'), pair(count(data.rx_frames), count(data.tx_frames))
			];
		}

		var table = E('div', { 'class': 'table' });

		for (var i = 0; i < rows.length; i += 2) {
			table.appendChild(E('div', { 'class': 'tr' }, [
				E('div', { 'class': 'td left', 'width': '33%' }, [rows[i]]),
				E('div', { 'class': 'td left' }, [rows[i + 1]])
			]));
		}

		return table;
	}
});
