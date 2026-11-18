// Every test sees the same visitor time zone, whatever the machine or CI runner
// uses. Set here (before Jest starts its workers) so all workers inherit it.
module.exports = async () => {
  process.env.TZ = "Europe/Berlin";
};
