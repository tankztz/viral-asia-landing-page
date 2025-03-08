import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {webhooksTrigger} from 'sanity-plugin-webhooks-trigger'

export default defineConfig({
  name: 'default',
  title: 'viral-asia-blog',

  projectId: '3an9f3n5',
  dataset: 'production',

  plugins: [
    structureTool(), 
    visionTool(),
    webhooksTrigger({
      urls: [{
        url: 'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/a281e103-a77e-4368-bb66-9028a472e71c',
        triggerOn: 'create update delete',
        name: 'Deploy to Cloudflare Pages'
      }]
    })
  ],

  schema: {
    types: schemaTypes,
  },
})
