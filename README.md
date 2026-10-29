# 8311 WAS-110 Community Firmware: basic variant

Firmware for the WAS-110 / PRX126 XGS-PON SFP+ stick. It builds on the
[8311 community firmware v2.8.3](https://github.com/djGrrr/8311-was-110-firmware-builder/releases/tag/v2.8.3)
by djGrrr, through two layers of changes:

1. **[linlunaire's fork](https://github.com/linlunaire/8311-was-110-firmware-builder)** (53 commits, 3–6 Oct 2026):
   safer A/B firmware upgrades, complete settings backup and restore, VLAN rule recovery,
   connection diagnostics, a lighter Argon-style web UI, many reliability fixes, and
   reproducible builds. Its documentation is in Chinese; the summary below is translated.
2. **This fork:** a reworked status page, automatic reload after reboots, and tagged GitHub
   releases.

The kernel, bootcore, drivers and vendor binaries are the unchanged v2.8.3 components. Every
build verifies all 270 protected binary entries against the pinned v2.8.3 base.

---

## Install or upgrade

1. Go to **System → Backup / Flash Firmware** and **download a configuration backup** first.
   It contains your PON authentication settings, so keep it private.
2. Check `local-upgrade.tar` against `SHA256SUMS`.
3. Upload `local-upgrade.tar`, let it validate, then choose **Install and trial boot**.
4. After the stick comes back on the new firmware, check management access and your
   connection, then click **Confirm current firmware**. Until you confirm, the next reboot
   returns to your previous firmware.

The default management address is `192.168.11.1`, user `root`, and there's no password until
you set one.

---

## What's new in this fork

### Status page
- **New rows in the PON Status panel**
  - **PON Link Uptime:** how long the fiber link has been operational (O5). It reads
    "Link down" otherwise. It reuses the existing `pon psg` call, so it costs nothing extra.
  - **VLAN Status:** the VLAN monitor's state, e.g. "Applied 12 min ago".
  - **Inactive Firmware:** the other bank's version, e.g.
    `Firmware Bank A, v2.8.3 (abc1234)`, or `empty`. It's read once and cached, an empty or
    unreadable bank is re-checked at most every 10 minutes, and installing firmware clears
    the cache.
- **New Traffic panel:** throughput, total since boot, and frames, down and up, read from the
  PON chip's hardware GEM counters. `eth0_0` interface statistics only count traffic that
  reaches the CPU, so they can't measure forwarded data. Throughput is timed with the stick's
  own uptime, so a missing NTP clock doesn't affect it.
- **New Storage panel:** usage of `/overlay` (settings and packages) and `/ptconf` (PON
  configuration).
- **Panel order:** System, PON Status, Memory, Storage, Traffic, Network.
- **Exact percentages and rounded bars**
  - Memory and Active Connections show two decimals, e.g. Buffered `0.53%`. The stock panels
    rounded down to whole numbers, so they showed `0%` with an empty bar.
  - Small values draw as a round dot that still grows in proportion, and 100% fills the bar
    exactly.
- **Readable bars in dark mode:** the empty part of each bar was nearly invisible on
  alternating rows and is now visible on every row.
- **Clearer labels and values**
  - **SFP+ Link Speed** (was "ETH Speed") reads `10 Gbps` / `2.5 Gbps` / `100 Mbps`
    instead of `10000 Mbps`.
  - **Active Firmware** reads `Firmware Bank B, v2.8.3.x (commit)` instead of just `B`.
  - **CPU Load (1, 5, 15 min)** replaces "Load Average".
  - **Firmware Version** now includes the build revision, e.g. `(v19.07.8_maxlinear)`.
  - **Local Time** is removed: the stick has no NTP by default, so the clock is wrong.

### Firmware page
- **Automatic reload after reboot:** after Reboot, Trial boot, Install and trial boot, or
  Reboot to previous default, the page waits for the stick to go down and come back, then
  reloads itself.
  - If an outage is missed between checks, it reloads anyway after 90 s.
  - After 5 minutes without a response, it asks you to check power and connection.
  - The reload only starts working from the reboot after you're running this firmware.

---

## From linlunaire's fork (translated from Chinese)

### Safer A/B firmware upgrades
- **Trial boot:** **Install and trial boot** boots the new firmware once without changing the
  default bank.
  - After it starts, the page offers **Confirm current firmware** or **Reboot to previous
    default**. Only confirming changes `commit_bank`.
  - While a trial is running, installing another image is blocked, so the fallback can't be
    overwritten.
- **Bank checks before switching:** before any switch, the inactive bank is checked.
  - It must have valid uImage headers with data CRCs for kernel and bootcore, and a SquashFS
    header and size for rootfs, plus a read-only mount with the essential boot files.
  - Empty banks, banks left incomplete by a failed install (`img_valid=false`), failed checks,
    or another upgrade in progress are refused.
- **Install safety**
  - The target bank is marked incomplete before writing and complete only after every
    component reads back correctly.
  - Upgrade packages are size-limited: 128 MiB package, 8 MiB kernel, 8 MiB bootcore,
    32 MiB rootfs. Every component's size and SHA-256 must match before anything is written.
  - All three target volumes are resolved and checked for capacity before the first write;
    volumes are never rebuilt or resized implicitly.
- **Shared upgrade lock:** web installs, bank switching, confirm, reboot and CLI installs use
  one lock, and boot-environment writes are verified by reading them back.
- **New CLI options:** `--no-commit` and `--trial`. The interactive flow is unchanged.
- **Inactive bank shown on the page:** the version of the inactive bank is shown, and the
  installer cache is cleared after installs.

### Settings backup, restore and reset
- **Backup:** a complete settings backup is a private `.env` file. It covers all supported
  8311 settings, PON identity and authentication, management, VLANs and the custom VLAN hook
  script.
- **Restore:** shows a preview of the changes, without values, before importing. It keeps PON
  settings by default.
  - Invalid files are rejected in full before the first write.
  - A backup containing a hook script asks for confirmation.
- **Reset to defaults:** keeps PON and bootloader settings by default, with an option to also
  clear PON settings. It never touches firmware bank selection.
- **Partial failures:** if a restore or reset partly fails, the page reports exactly which
  fields were confirmed, unconfirmed or not attempted, and doesn't reboot on its own.

### VLANs
- **Rule recovery:** the VLAN monitor re-checks TC rule structure on `eth0_*` and `pmapper*`
  roughly every 30 seconds. It ignores counters and timers, so normal traffic doesn't trigger
  rewrites.
  - Lost or changed rules are detected and re-applied, including after the PON interface
    disappears and returns.
  - Read failures are reported and retried, never mistaken for empty or successful rules.
- **Empty versus failed OMCI tables:** an empty extended VLAN table is now reported as empty
  rather than as an error, and real failures are no longer hidden.
- **Output limits:** VLAN detection, rule application, hook output and rule fingerprinting
  share a 1 MiB output budget. Oversized or failed results are discarded and retried.
- **Hook script example:** `examples/vlan_fixes_hook.sh` covers untagged PPPoE Internet and
  optional IPTV.

### Diagnostics
- **Connection diagnostics on the PON Status page:** optical power, temperature, link speed,
  interface packet, drop and error counts, and per-rule TC action counters.
  - It refreshes every 10 s while visible and stops when the tab is hidden.
  - Failed reads are marked as stale.
  - Detailed TC counters are only read while that section is open.
- **Bounded queries:** PON, managed entity (ME) and VLAN queries have timeouts and output
  limits, and never return half-finished results. A late response can't overwrite a newer
  selection.
- **Support archive:** limited to 1 MiB per item and 8 MiB for data and the archive. It's
  redacted by default, with an explicit raw option. Incomplete archives are never published.

### Web UI
- **Theme:** a lightweight Argon-style layout on top of the stock LuCI.
  - Full-height sidebar with colored menu icons, a compact card layout, and a left-aligned
    login panel.
  - Light, dark or follow-system appearance via sun, moon and monitor buttons in the top-right
    corner. The choice is stored per browser.
  - Mobile navigation, keyboard support, and readable native LuCI widgets in both appearances.
  - No web fonts, images, video or extra polling. The CSS and JS are minified.
- **Simplified Chinese interface**, with desktop and mobile layouts.
- **Hook editor:** shows the file name in a monospace editor, keeps buttons visible, and
  supports keyboard focus handling.
- **Smaller fixes:** configuration refresh after saving, VLAN apply feedback, backup downloads
  on older LuCI response headers, and Firefox form restoration.

### Reliability fixes
- **Boot environment reads:** reads have timeouts and size limits, and failures are never
  treated as missing or default values. Writes are confirmed by reading back a complete
  snapshot.
- **Temporary space checks:** account for the stick's zero-capacity tmpfs by budgeting against
  free RAM, with an 8 MiB margin.
- **Streaming verification:** bank checks and flash readback verify CRCs and lengths as a
  stream instead of storing copies, which saves about 5 MiB of temporary space for the
  bootcore.
- **Image and environment fixes**
  - CRC checks match BusyBox's real output format.
  - Old firmware banners are parsed correctly.
  - The fallback for the B bank's software version is fixed.
  - Integer sign handling is fixed.
  - Special characters are handled in MIB replacement.
- **Factory reset script:** stops safely on read or write failures and keeps a recovery backup.

### Performance
- **Configuration page:** preparing the page takes about 362 ms instead of 529 ms on the
  device, with 4 shell calls instead of 9.
- **Base64 for backups:** uses the firmware's native encoder. For 64 KiB, encoding takes
  4.3 ms instead of 6,328 ms and decoding 8.4 ms instead of 6,995 ms, with byte-identical
  output.
- **Single boot-environment reads:** about 10% faster.
- **Upgrade installer:** parses metadata once instead of nine `grep | cut` calls, and runs
  three volume queries instead of six.

These are device-side measurements of specific operations; they don't describe line
throughput.

### Builds and testing
- **Reproducible builds:** firmware is built from the pinned upstream v2.8.3 package with a
  verified hash. Every rootfs file, mode and symlink is checked, and the build manifest records
  the source commit and CI run.
- **CI coverage:** CI runs the shell and BusyBox regression suites, Lua controller tests, and
  browser tests in Chromium, Firefox and WebKit before building.

---

## Compatibility and known limitations

- **Not for CN-branch settings:** this firmware isn't a drop-in replacement for the CN
  (xiao-k233) branch. The same settings mean different things here; for example,
  `fix_vlans=2` runs only the hook script, where the CN branch uses it for TC mode. Check your
  VLAN and IPTV settings before migrating.
- **What has been verified:** the management UI, image checks, A/B trial boots and bank
  switching have been verified on a device. Fiber service on other OLTs, IPTV,
  power-loss recovery and long-term stability depend on your line and should be checked after
  upgrading.
- **No automatic fallback on a failed boot:** a trial boot returns to the previous default
  only after another reboot. There's no boot counter that falls back on its own if the new
  firmware hangs.
- **Generic images aren't accepted:** generic OpenWrt or ImmortalWrt sysupgrade images are
  rejected.

---

## Credits

- [djGrrr](https://github.com/djGrrr/8311-was-110-firmware-builder) and the 8311 community,
  for the base firmware.
- [linlunaire](https://github.com/linlunaire/8311-was-110-firmware-builder), for the fork
  this release builds on.
- The theme is adapted from [Argon](https://github.com/jerrykuku/luci-theme-argon) by
  jerrykuku and Lutty Yang (Apache-2.0).
- Original copyright and license notices are kept in the source and on the web UI's
  **Credits and licenses** page.
