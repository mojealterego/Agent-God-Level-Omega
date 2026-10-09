"""Contract verification: external dependencies are deliberately unnecessary."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

MODULE = Path(__file__).parents[1] / 'scripts' / 'tool_contract.py'
spec = importlib.util.spec_from_file_location('tool_contract', MODULE)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class ToolContractTests(unittest.TestCase):
    def test_factory_has_correct_input_schemas(self):
        for operation in mod.OPERATIONS:
            contract = mod.new_contract('omega-kit', 'Offline tools', 'my_' + operation, 'Test ' + operation, operation)
            self.assertEqual(mod.validate(contract), [])
            self.assertEqual(contract['tools'][0]['inputSchema'], mod.OPERATIONS[operation])

    def test_reject_unknown_operation(self):
        contract = mod.new_contract('omega-kit', 'Offline tools', 'echo', 'Echo', 'echo_text')
        contract['tools'][0]['operation'] = 'shell'
        self.assertTrue(mod.validate(contract))

    def test_reject_duplicate_names(self):
        contract = mod.new_contract('omega-kit', 'Offline tools', 'echo', 'Echo', 'echo_text')
        contract['tools'].append(dict(contract['tools'][0]))
        self.assertTrue(any('duplicate' in x for x in mod.validate(contract)))

    def test_reject_schema_drift(self):
        contract = mod.new_contract('omega-kit', 'Offline tools', 'echo', 'Echo', 'echo_text')
        contract['tools'][0]['inputSchema']['additionalProperties'] = True
        self.assertTrue(mod.validate(contract))

    def test_reject_untrusted_read_only_claim(self):
        contract = mod.new_contract('omega-kit', 'Offline tools', 'echo', 'Echo', 'echo_text')
        contract['tools'][0]['annotations']['openWorldHint'] = True
        self.assertTrue(mod.validate(contract))

    def test_write_read_and_digest(self):
        contract = mod.new_contract('omega-kit', 'Offline tools', 'echo', 'Echo', 'echo_text')
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / 'contract.json'
            mod.write_contract(p, contract)
            self.assertEqual(mod.read_contract(p), contract)
            self.assertEqual(len(mod.digest(p)), 64)
            with self.assertRaises(FileExistsError):
                mod.write_contract(p, contract)

    def test_add_tool(self):
        contract = mod.new_contract('omega-kit', 'Offline tools', 'echo', 'Echo', 'echo_text')
        mod.add_tool(contract, 'add', 'Sum two numbers', 'sum_numbers')
        self.assertEqual(len(contract['tools']), 2)
        self.assertEqual(mod.validate(contract), [])

    def test_reject_injection_into_name(self):
        with self.assertRaises(ValueError):
            mod.new_contract('omega-kit', 'Offline tools', '__import__("os")', 'Bad', 'echo_text')


if __name__ == '__main__':
    unittest.main()
