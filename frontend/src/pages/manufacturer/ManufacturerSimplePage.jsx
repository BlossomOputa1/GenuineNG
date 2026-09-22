import Icon from "../../components/Icon";

const copy = {
  team: {
    eyebrow: "MANAGEMENT",
    title: "Team",
    text: "Invite and manage manufacturer portal users here once team permissions are connected to the Layer 2 backend.",
    icon: "users",
  },
  settings: {
    eyebrow: "MANAGEMENT",
    title: "Settings",
    text: "Company profile, portal preferences and production settings will live here. Signing-key controls remain server-only and are never exposed in this interface.",
    icon: "settings",
  },
};

export default function ManufacturerSimplePage({ page }) {
  const content = copy[page] || copy.settings;
  return (
    <div className="manufacturer-page">
      <section className="manufacturer-page-intro compact"><div><span className="manufacturer-eyebrow">{content.eyebrow}</span><h1>{content.title}</h1><p>{content.text}</p></div></section>
      <section className="manufacturer-panel manufacturer-coming-panel"><span><Icon name={content.icon} size={24} /></span><h2>{content.title} workspace</h2><p>This frontend area is ready for the backend permissions and data wiring in the next Layer 2 implementation step.</p></section>
    </div>
  );
}
