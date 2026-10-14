// Browser entry to the shared, dependency-free standalone HTML exporter.
import { renderStandaloneEditor } from '../../app/launcher.js';

export const buildStandaloneEditor = (source, schema) => renderStandaloneEditor(source, schema);
