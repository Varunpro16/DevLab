import React from 'react';
import LabProjectList from '../components/LabProjectList';

// Only languages with a working backend-go template + environment (see
// internal/templates/templates.go) are offered here.
const DEVOPS_LANGUAGES = [
  { id: 'docker', label: 'Docker', color: '#2496ed', icon: 'dkr' },
  { id: 'terraform', label: 'Terraform', color: '#844fba', icon: 'tf' },
];

const DevOpsLab = () => (
  <LabProjectList
    labTitle="DevOps Lab"
    labIcon="⚙️"
    languages={DEVOPS_LANGUAGES}
    backPath="/labs"
  />
);

export default DevOpsLab;
