import os.path
from setuptools import setup

package_dir = os.path.abspath(os.path.dirname(__file__))
version_file = os.path.join(package_dir, "version")
with open(version_file) as version_file_handle:
    version = version_file_handle.read()

setup(
    name="sandals",
    install_requires=["falcon"],
    version=version,
    description="Sandals",
    packages=["sandals"],
    classifiers=[],
    python_requires='>=2.7',
    package_data = {
        "sandals":["sandals.js"]
    }
)
