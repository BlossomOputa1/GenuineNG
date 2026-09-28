import Icon from "../../components/Icon";

const copy = {
  team: {
    eyebrow: "MANAGEMENT",
    title: "Team",
    text: "Team access is coming later. This release keeps one approved manufacturer account boundary per company.",
    icon: "users",
  },
};

export default function ManufacturerSimplePage({ page }) {
  const content = copy[page] || copy.team;
  return (
    <div className="manufacturer-page">
      <section className="manufacturer-page-intro compact"><div><span className="manufacturer-eyebrow">{content.eyebrow}</span><h1>{content.title}</h1><p>{content.text}</p></div></section>
      <section className="manufacturer-panel manufacturer-coming-panel"><span><Icon name={content.icon} size={24} /></span><h2>{content.title} workspace</h2><p>Coming later. No team-management permissions are exposed in this release.</p></section>
    </div>
  );
}
