import json
import logging
import mlflow
import os
import sys

# logging configuration
logger = logging.getLogger('model_registration')
logger.setLevel('DEBUG')

console_handler = logging.StreamHandler()
console_handler.setLevel('DEBUG')

file_handler = logging.FileHandler('model_registration_errors.log')
file_handler.setLevel('ERROR')

formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
console_handler.setFormatter(formatter)
file_handler.setFormatter(formatter)

logger.addHandler(console_handler)
logger.addHandler(file_handler)

def load_experiment_info(file_path: str) -> dict:
    """Load experiment info from a JSON file."""
    try:
        with open(file_path, 'r') as file:
            info = json.load(file)
        logger.debug('Experiment info loaded from %s', file_path)
        return info
    except Exception as e:
        logger.error('Error loading experiment info from %s: %s', file_path, e)
        raise

def register_model(run_id: str, model_path: str, model_name: str):
    """Register the model to the MLflow Model Registry."""
    try:
        model_uri = f"runs:/{run_id}/{model_path}"
        result = mlflow.register_model(model_uri, model_name)
        
        # Transition the model to 'Staging' stage
        client = mlflow.MlflowClient(tracking_uri="http://13.233.131.207/")
        client.transition_model_version_stage(
            name=model_name,
            version=result.version,
            stage="Staging"
        )
        
        logger.debug('Model registered with name: %s, version: %s', result.name, result.version)
        logger.debug('Model transitioned to Staging stage')
        return result
    except Exception as e:
        logger.error('Error registering model: %s', e)
        raise

def main():
    mlflow.set_tracking_uri("http://13.233.131.207/")
    
    try:
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
        info_path = os.path.join(root_dir, 'experiment_info.json')
        
        experiment_info = load_experiment_info(info_path)
        
        run_id = experiment_info['run_id']
        model_path = experiment_info['model_path']
        
        # You can customize the model name here
        model_name = "yt_comment_sentiment_analysis" 
        
        register_model(run_id, model_path, model_name)
        
        logger.info("Model registration process completed successfully.")
        
    except Exception as e:
        logger.error("Failed to complete model registration: %s", e)
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()