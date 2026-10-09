import json
import tempfile
import unittest
import zipfile
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from skillforge import create_skill, validate_skill, package_skill, catalog_skills, SkillError


class SkillForgeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.workflow = self.root / 'workflow.md'
        self.workflow.write_text('# Workflow\n\n1. Read input.\n2. Validate output.\n3. Record evidence.\n', encoding='utf-8')

    def build(self):
        return create_skill(
            root=self.root / 'skills',
            name='quality-review',
            description='Review code quality using deterministic rules. Use when assessing a patch.',
            instructions_path=self.workflow,
            display_name='Quality Review',
            short_description='Review code changes',
            default_prompt='Review this code change.',
        )

    def test_creates_complete_valid_skill(self):
        p = self.build()
        self.assertTrue((p / 'SKILL.md').is_file())
        self.assertTrue((p / 'agents' / 'openai.yaml').is_file())
        self.assertEqual(validate_skill(p), [])
        self.assertIn('Review code quality', (p / 'SKILL.md').read_text())

    def test_create_refuses_existing_target(self):
        self.build()
        with self.assertRaises(SkillError):
            self.build()

    def test_validate_rejects_invalid_name_and_directory(self):
        p = self.build()
        (p / 'SKILL.md').write_text('---\nname: wrong-name\ndescription: OK\n---\n# Test\n', encoding='utf-8')
        self.assertTrue(any('directory' in e for e in validate_skill(p)))

    def test_validate_rejects_missing_relative_markdown_link(self):
        p = self.build()
        f = p / 'SKILL.md'
        f.write_text(f.read_text(encoding='utf-8') + '\nSee [guide](references/missing.md).\n', encoding='utf-8')
        self.assertTrue(any('missing' in e for e in validate_skill(p)))

    def test_validate_rejects_placeholder(self):
        p = self.build()
        f = p / 'SKILL.md'
        f.write_text(f.read_text(encoding='utf-8') + '\nTODO: implement\n', encoding='utf-8')
        self.assertTrue(any('placeholder' in e for e in validate_skill(p)))

    def test_package_contains_only_expected_root_and_is_deterministic(self):
        p = self.build()
        archive = self.root / 'quality-review.zip'
        package_skill(p, archive)
        b1 = archive.read_bytes()
        package_skill(p, archive)
        self.assertEqual(b1, archive.read_bytes())
        with zipfile.ZipFile(archive) as z:
            self.assertTrue(all(f.startswith('quality-review/') for f in z.namelist()))
            self.assertIn('quality-review/SKILL.md', z.namelist())
        self.assertTrue((self.root / 'quality-review.zip.sha256').exists())

    def test_package_rejects_symlink(self):
        p = self.build()
        (p / 'secrets.txt').symlink_to(self.workflow)
        with self.assertRaises(SkillError):
            package_skill(p, self.root / 'bad.zip')

    def test_catalog_groups_mirrors_by_name(self):
        p = self.build()
        import shutil
        mirror = self.root / 'other' / p.name
        mirror.parent.mkdir(parents=True)
        shutil.copytree(p, mirror)
        report = catalog_skills([self.root / 'skills', self.root / 'other'])
        self.assertEqual(report['total_instances'], 2)
        self.assertEqual(report['unique_names'], 1)
        self.assertEqual(report['invalid_instances'], 0)

    def test_rejects_invalid_path(self):
        with self.assertRaises(SkillError):
            create_skill(root=self.root, name='../bad', description='a',
                         instructions_path=self.workflow, display_name='Bad',
                         short_description='Bad', default_prompt='Bad')

if __name__ == '__main__':
    unittest.main()
