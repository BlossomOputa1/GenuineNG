import Icon from '../components/Icon';

const pageCopy = {
  about: {
    eyebrow: 'ABOUT GENUINENG',
    title: 'This page is coming next.',
    copy: 'For now, Layer 1 is focused on the complete product-label checking experience. The About page will be filled in after the core flow is stable.',
  },
  help: {
    eyebrow: 'HELP',
    title: 'Help content is coming next.',
    copy: 'The live Layer 1 flow already explains each step and what a result can and cannot prove. A fuller help centre will be added after the core build is stable.',
  },
  partners: {
    eyebrow: 'PARTNERS',
    title: 'GenuineNG for manufacturers.',
    copy: 'Approved manufacturers use the Layer 2 portal to manage products, production batches, GenuineNG codes and aggregate scan activity.',
  },
  contact: {
    eyebrow: 'CONTACT',
    title: 'Contact details are coming next.',
    copy: 'The contact page is being kept as a placeholder while the Layer 1 scan, account and history experience is completed.',
  },
};

export default function PlaceholderPage({ page, navigate }) {
  const content = pageCopy[page] || pageCopy.about;
  return (
    <section className="placeholder-page">
      <div className="placeholder-card">
        <span className="placeholder-icon"><Icon name="info" size={22} /></span>
        <span className="eyebrow">{content.eyebrow}</span>
        <h1>{content.title}</h1>
        <p>{content.copy}</p>
        {page === 'partners' ? (
          <button type="button" className="button primary" onClick={() => navigate('/manufacturer')}>Open manufacturer portal <Icon name="arrow" size={16} /></button>
        ) : (
          <button type="button" className="button primary" onClick={() => navigate('/')}>Back to main <Icon name="arrow" size={16} /></button>
        )}
      </div>
    </section>
  );
}
