import unittest
from subject import unique_in_order


class TestUniqueInOrder(unittest.TestCase):

    def test_repeated_strings(self):
        self.assertEqual(unique_in_order(["a", "b", "a", "c", "b"]), ["a", "b", "c"])

    def test_repeated_integers(self):
        self.assertEqual(unique_in_order([1, 2, 2, 3, 1, 4]), [1, 2, 3, 4])

    def test_empty_input(self):
        self.assertEqual(unique_in_order([]), [])

    def test_none_input(self):
        with self.assertRaises(TypeError):
            unique_in_order(None)


if __name__ == "__main__":
    unittest.main()
