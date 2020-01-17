import json
import os.path
import pathlib

import falcon

from pymongo_mapreduce.ui.auth import GoogleOauthRedirectResource, GoogleOauthReturnResource
from pymongo_mapreduce.config import get_config
from pymongo_mapreduce.web import handle_exception, LoggerMiddleware


current_directory = os.path.dirname(os.path.abspath(__file__))
ui_directory = os.path.abspath(os.path.join(current_directory, "../../ui"))

def get_files(root_path):
    files = {}
    root_path = pathlib.Path(root_path)
    for entry in root_path.iterdir():
        if entry.is_file():
            files[entry.name] = entry.read_text()
        else:
            files[entry.name] = get_files(entry)
    return files

def get_components_js(map_name, path):
    path = pathlib.Path(path)
    js = map_name +" = {"
    for component_name, component_files in get_files(path).items():
        js += component_name + ": {"
        for file_name, file_contents in component_files.items():
            file_name = pathlib.Path(file_name)
            js += "\"" + file_name.name + "\": "
            if file_name.suffix == ".html":
                js += json.dumps(file_contents)
            else:
                js += file_contents
            js += ","
        js += "},"
    js += "};\n"
    return js

def load_framework_js():
    with open(os.path.join(ui_directory, "framework.js")) as app_file_obj:
        framework_js = app_file_obj.read()
    return framework_js

def load_index_js(relative_app_path):
    app_dir = os.path.join(ui_directory, relative_app_path)
    with open(os.path.join(app_dir, "index.js")) as app_file_obj:
        app_js = app_file_obj.read()
    app_js += "\n" + get_components_js("pages", os.path.join(app_dir, "pages")) + "\n"
    app_js += get_components_js("components", os.path.join(app_dir, "components"))
    return app_js

def load_index_html(relative_app_path):
    app_dir = os.path.join(ui_directory, relative_app_path)
    with open(os.path.join(app_dir, "index.html")) as file_obj:
        index_html = file_obj.read()
    return index_html

class FrameworkJSResource:
    def __init__(self):
        self.framework_js = load_framework_js()
        reload = os.environ.get("RELOAD_UI")
        if reload == "true":
            self.reload = True
        else:
            self.reload = False

    def on_get(self, req, resp):
        if self.reload:
            self.framework_js = load_framework_js()
        resp.body = self.framework_js
        resp.content_type = falcon.MEDIA_JS

class IndexJSResource:
    def __init__(self, relative_app_path, reload_disk=False):
        self.relative_app_path = relative_app_path
        self.index_js = load_index_js(relative_app_path)
        self.reload_disk = reload_disk

    def on_get(self, req, resp):
        if self.reload_disk:
            self.index_js = load_index_js(self.relative_app_path)
        resp.body = self.index_js
        resp.content_type = falcon.MEDIA_JS

class IndexHTMLResource:
    def __init__(self, relative_app_path, reload_disk=False):
        self.relative_app_path = relative_app_path
        self.index_html = load_index_html(self.relative_app_path)
        self.reload_disk = reload_disk

    def on_get(self, req, resp):
        if self.reload_disk:
            self.index_html = load_index_html(self.relative_app_path)
        resp.body = self.index_html
        resp.content_type = falcon.MEDIA_HTML
