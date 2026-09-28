import React from 'react';
import LabProjectList from '../components/LabProjectList';

// Only languages with a working backend-go template + environment (see
// internal/templates/templates.go) are offered here.
const DEV_LANGUAGES = [
  { id: 'react', label: 'React', color: '#61dafb', icon: 'jsx' },
  { id: 'node', label: 'Node.js', color: '#68a063', icon: 'js' },
];

const DevelopmentLab = () => (
  <LabProjectList
    labTitle="Development Lab"
    labIcon="💻"
    languages={DEV_LANGUAGES}
    backPath="/labs"
  />
);

export default DevelopmentLab;
