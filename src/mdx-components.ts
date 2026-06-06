import type { MDXComponents } from 'mdx/types';
import RulesBox from '@/components/blocks/RulesBox.astro';
import StepsBox from '@/components/blocks/StepsBox.astro';
import CodeBlock from '@/components/blocks/CodeBlock.astro';
import CodeTab from '@/components/blocks/CodeTab.astro';
import CodeTabs from '@/components/blocks/CodeTabs.astro';
import ExerciseBox from '@/components/blocks/ExerciseBox.astro';
import LinkGrid from '@/components/blocks/LinkGrid.astro';
import DataTypesGrid from '@/components/blocks/DataTypesGrid.astro';
import LogicalOperators from '@/components/blocks/LogicalOperators.astro';
import ContentTable from '@/components/blocks/ContentTable.astro';
import TextBlock from '@/components/blocks/TextBlock.astro';
import YouTubeEmbed from '@/components/blocks/YouTubeEmbed.astro';

export const components: MDXComponents = {
  TextBlock,
  YouTubeEmbed,
  RulesBox,
  StepsBox,
  CodeBlock,
  CodeTab,
  CodeTabs,
  ExerciseBox,
  LinkGrid,
  DataTypesGrid,
  LogicalOperators,
  ContentTable,
  EmphasisBox: RulesBox,
};
